import { describe, expect, it } from 'vitest';
import { serializePublicProfile } from './serializers/public-profile.serializer.js';
import { validateUpdateProfileAvailabilityDto } from './dto/update-profile-availability.dto.js';
import { validateUpdateProfileExperienceDto } from './dto/update-profile-experience.dto.js';

describe('Profile validation', () => {
  it('acepta niveles de dominio validos y los normaliza', () => {
    const validation = validateUpdateProfileExperienceDto({
      experience: [{
        skillName: 'React',
        yearsOfExperience: 3,
        level: 'Advanced'
      }]
    });

    expect(validation.issues).toHaveLength(0);
    expect(validation.value.experience[0]).toMatchObject({
      skillName: 'React',
      level: 'advanced'
    });
  });

  it('rechaza niveles de dominio fuera del catalogo permitido', () => {
    const validation = validateUpdateProfileExperienceDto({
      experience: [{
        skillName: 'React',
        yearsOfExperience: 3,
        level: 'guru'
      }]
    });

    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'experience.0.level' })
    ]));
  });

  it('valida disponibilidad evitando solapes y rangos invertidos', () => {
    const validation = validateUpdateProfileAvailabilityDto({
      availability: [{
        day: 'monday',
        timeSlots: [
          { start: '10:00', end: '09:00' },
          { start: '11:00', end: '12:00' }
        ]
      }]
    });

    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'availability.0.timeSlots.0' })
    ]));
  });

  it('no expone datos sensibles en el perfil publico serializado', () => {
    const profile = serializePublicProfile({
      userId: 'user-1',
      user: 'Public User',
      experience: [],
      availability: [],
      email: 'private@example.com',
      passwordHash: 'hash'
    } as never);

    expect(profile).toEqual({
      userId: 'user-1',
      user: 'Public User',
      experience: [],
      availability: []
    });
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('passwordHash');
  });
});
