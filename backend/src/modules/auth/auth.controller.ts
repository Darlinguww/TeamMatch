import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';

export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body as RegisterDto);
    res.status(201).json(result);
  });

  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body as LoginDto);
    res.status(200).json(result);
  });
}
