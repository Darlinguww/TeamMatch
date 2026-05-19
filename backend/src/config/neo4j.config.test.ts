import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifyConnectivity, mockDriverFn, mockAuthBasic } = vi.hoisted(() => {
  const mockVerifyConnectivity = vi.fn();
  const mockDriverFn = vi.fn(() => ({ verifyConnectivity: mockVerifyConnectivity }));
  const mockAuthBasic = vi.fn((user: string, password: string) => ({ user, password }));
  return { mockVerifyConnectivity, mockDriverFn, mockAuthBasic };
});

vi.mock('neo4j-driver', () => ({
  default: {
    driver: mockDriverFn,
    auth: { basic: mockAuthBasic },
  },
}));

vi.mock('./env.js', () => ({
  env: {
    neo4j: {
      uri: 'bolt://neo4j-test:7687',
      user: 'neo4j',
      password: 'secret-test',
    },
  },
}));

describe('neo4j.config (SCRUM-185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('crea el driver Bolt con URI, auth basic y disableLosslessIntegers desde env', async () => {
    const { driver } = await import('./neo4j.config.js');

    expect(mockAuthBasic).toHaveBeenCalledWith('neo4j', 'secret-test');
    expect(mockDriverFn).toHaveBeenCalledWith(
      'bolt://neo4j-test:7687',
      { user: 'neo4j', password: 'secret-test' },
      { disableLosslessIntegers: true }
    );
    expect(driver.verifyConnectivity).toBe(mockVerifyConnectivity);
  });

  it('verifyConnectivity resuelve cuando el servidor Neo4j responde', async () => {
    mockVerifyConnectivity.mockResolvedValue(undefined);

    const { verifyConnectivity } = await import('./neo4j.config.js');
    await expect(verifyConnectivity()).resolves.toBeUndefined();
    expect(mockVerifyConnectivity).toHaveBeenCalledOnce();
  });

  it('verifyConnectivity lanza un error claro si Neo4j no está disponible', async () => {
    mockVerifyConnectivity.mockRejectedValue(new Error('Connection refused'));

    const { verifyConnectivity } = await import('./neo4j.config.js');

    await expect(verifyConnectivity()).rejects.toThrow(
      'Neo4j no disponible en bolt://neo4j-test:7687 (usuario: neo4j). Connection refused. ' +
        'Verifica que el contenedor neo4j esté healthy y las variables NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD.'
    );
  });
});
