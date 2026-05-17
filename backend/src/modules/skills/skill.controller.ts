import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { CreateSkillInput, UpdateSkillInput } from './types/skill.types.js';
import { SkillService } from './skill.service.js';

export class SkillController {
  public constructor(private readonly skillService: SkillService) {}

  public list = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const skills = await this.skillService.list();
    res.status(200).json({ skills });
  });

  public get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const skill = await this.skillService.get(req.params.id);
    res.status(200).json({ skill });
  });

  public create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const skill = await this.skillService.create(req.body as CreateSkillInput);
    res.status(201).json({ skill });
  });

  public update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const skill = await this.skillService.update(req.params.id, req.body as UpdateSkillInput);
    res.status(200).json({ skill });
  });

  public delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await this.skillService.delete(req.params.id);
    res.status(204).send();
  });
}
