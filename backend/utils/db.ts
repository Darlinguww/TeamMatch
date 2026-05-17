import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j';

export const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

export async function findUserById(userId: string) {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (u:Usuario {userId: $userId}) RETURN u.userId AS userId, u.email AS email',
      { userId }
    );
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];
    return { userId: record.get('userId'), email: record.get('email') };
  } finally {
    await session.close();
  }
}

export async function findUserByEmail(email: string) {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (u:Usuario {email: $email}) RETURN u.userId AS userId, u.email AS email, u.passwordHash AS passwordHash',
      { email }
    );
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];
    return {
      userId: record.get('userId'),
      email: record.get('email'),
      passwordHash: record.get('passwordHash')
    };
  } finally {
    await session.close();
  }
}
