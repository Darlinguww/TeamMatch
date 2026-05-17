import { Router } from 'express';
import { validateDto } from '../../shared/middlewares/validateDto.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { validateLoginDto } from './dto/login.dto.js';
import { validateRegisterDto } from './dto/register.dto.js';
import { JwtAuthMiddleware } from './middlewares/jwt-auth.middleware.js';
import { LoginAttemptRepository } from './repositories/login-attempt.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { LoginAttemptService } from './services/login-attempt.service.js';

const router = Router();
const userRepository = new UserRepository();
const loginAttemptRepository = new LoginAttemptRepository();
const loginAttemptService = new LoginAttemptService(loginAttemptRepository);
const authService = new AuthService(userRepository, loginAttemptService);
const authController = new AuthController(authService);
const jwtAuth = new JwtAuthMiddleware(userRepository);

export const requireAuth = jwtAuth.authenticate;

router.post('/register', validateDto(validateRegisterDto), authController.register);
router.post('/login', validateDto(validateLoginDto), authController.login);
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
