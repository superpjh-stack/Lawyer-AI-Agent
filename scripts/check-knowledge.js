const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.lawKnowledge.count();
  const nullLawyer = await prisma.lawKnowledge.count({ where: { lawyerId: null } });
  const chunk0 = await prisma.lawKnowledge.count({ where: { chunkIndex: 0 } });
  const sample = await prisma.lawKnowledge.findFirst({
    select: { id: true, title: true, lawyerId: true, chunkIndex: true, totalChunks: true }
  });
  console.log('total:', total, '| lawyerId=null:', nullLawyer, '| chunkIndex=0:', chunk0);
  console.log('sample:', JSON.stringify(sample));
  await prisma.$disconnect();
}
main().catch(console.error);
