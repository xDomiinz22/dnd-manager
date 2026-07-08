import argon2 from "argon2";
import { prisma } from "../lib/prisma";

async function main() {
  const passwordHash = await argon2.hash("demo1234");

  const master = await prisma.user.upsert({
    where: { email: "master@demo.local" },
    update: {},
    create: {
      email: "master@demo.local",
      username: "master_demo",
      passwordHash,
    },
  });

  const group = await prisma.group.upsert({
    where: { inviteCode: "DEMO01" },
    update: {},
    create: {
      name: "Grupo Demo",
      inviteCode: "DEMO01",
      masterId: master.id,
      members: {
        create: {
          userId: master.id,
          role: "MASTER",
        },
      },
    },
  });

  console.log({ master: master.email, group: group.name, inviteCode: group.inviteCode });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
