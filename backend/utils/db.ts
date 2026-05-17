import { driver } from '../src/database/neo4j.js';
import { UserRepository } from '../src/modules/auth/repositories/user.repository.js';

export { driver };

const userRepository = new UserRepository();

export async function findUserById(userId: string) {
  return userRepository.findById(userId);
}

export async function findUserByEmail(email: string) {
  return userRepository.findByEmail(email);
}
