import { BadRequestError, ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { Neo4jProjectRepository } from '../projects/repositories/project.repository.js';

const DEFAULT_WINDOW_DAYS = 7;

export class FeedbackService {
  private readonly projectRepo: Neo4jProjectRepository;

  public constructor(projectRepo?: Neo4jProjectRepository) {
    this.projectRepo = projectRepo ?? new Neo4jProjectRepository();
  }

  public async submitFeedback(fromUserId: string, input: { projectId: string; toUserId: string; score: unknown; comment?: unknown }) {
    const projectId = String(input.projectId || '').trim();
    const toUserId = String(input.toUserId || '').trim();
    const score = Number(input.score);
    const comment = typeof input.comment === 'string' ? input.comment.trim() : null;

    if (!projectId) throw new BadRequestError('projectId is required');
    if (!toUserId) throw new BadRequestError('toUserId is required');
    if (!Number.isFinite(score) || score < 1 || score > 5) throw new BadRequestError('score must be a number between 1 and 5');

    // Project must be completed and feedback window enabled
    // We rely on repository properties stored on Proyecto node
    const isMember = await this.projectRepo.isUserMemberOfProject(fromUserId, projectId);
    if (!isMember) throw new ForbiddenError('User is not a member of the project');

    const toIsMember = await this.projectRepo.isUserMemberOfProject(toUserId, projectId);
    if (!toIsMember) throw new BadRequestError('Target user is not a member of the project');

    if (fromUserId === toUserId) throw new BadRequestError('Self-evaluations are not allowed');

    const hasExisting = await this.projectRepo.hasFeedbackBetweenUsers(projectId, fromUserId, toUserId);
    if (hasExisting) throw new BadRequestError('Feedback already submitted for this user in this project');

    // Verify project feedback window
    const leader = await this.projectRepo.findProjectLeader(projectId);
    if (leader === null) throw new BadRequestError('Project not found');

    // Read feedback window properties via a small run
    const { driver } = await import('../../database/neo4j.js');
    const s = driver.session();
    try {
      const result = await s.run(`MATCH (p:Proyecto {projectId: $projectId}) RETURN p.feedbackEnabled AS feedbackEnabled, p.feedbackStart AS feedbackStart, p.feedbackEnd AS feedbackEnd, p.status AS status LIMIT 1`, { projectId });
      const rec = result.records[0];
      const feedbackEnabled = Boolean(rec?.get('feedbackEnabled'));
      const status = rec?.get('status') ? String(rec.get('status')) : null;
      const feedbackStart = rec?.get('feedbackStart') ? String(rec.get('feedbackStart')) : null;
      const feedbackEnd = rec?.get('feedbackEnd') ? String(rec.get('feedbackEnd')) : null;

      if (status !== 'COMPLETED' && !feedbackEnabled) throw new BadRequestError('Project not finalized for feedback');

      const now = new Date();
      if (feedbackStart && feedbackEnd) {
        const start = new Date(feedbackStart);
        const end = new Date(feedbackEnd);
        if (now < start || now > end) throw new BadRequestError('Feedback window is closed');
      } else if (!feedbackEnabled) {
        throw new BadRequestError('Feedback not enabled for this project');
      }

      // Persist feedback
      const createdAt = new Date().toISOString();
      await this.projectRepo.createFeedbackRelationship(projectId, fromUserId, toUserId, score, comment, createdAt);

      return { projectId, fromUserId, toUserId, score, comment, createdAt };
    } finally {
      await s.close();
    }
  }

  public async closeProjectAndEnableFeedback(initiatorUserId: string, projectId: string, windowDays = DEFAULT_WINDOW_DAYS) {
    // Only project leader can close
    const leaderId = await this.projectRepo.findProjectLeader(projectId);
    if (!leaderId) throw new BadRequestError('Project not found');
    if (leaderId !== initiatorUserId) throw new ForbiddenError('Only project leader can close the project');

    const start = new Date();
    const end = new Date(start.getTime() + windowDays * 24 * 60 * 60 * 1000);

    await this.projectRepo.setProjectStatusAndFeedback(projectId, 'COMPLETED', true, start.toISOString(), end.toISOString());

    return { projectId, feedbackStart: start.toISOString(), feedbackEnd: end.toISOString() };
  }
}

export default FeedbackService;
