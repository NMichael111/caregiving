import { prisma } from "./lib/db.js";
import { auth } from "./lib/auth.js";

const ADMIN_PASSWORD = "admin1234";
const CAREGIVER_PASSWORD = "caregiver1234";

async function clean() {
  await prisma.message.deleteMany();
  await prisma.threadMember.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.shiftTask.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(
  email: string,
  password: string,
  name: string,
  role: "ADMIN" | "CAREGIVER",
) {
  await auth.api.signUpEmail({ body: { email, password, name } });
  return prisma.user.update({ where: { email }, data: { role } });
}

async function main() {
  console.log("[seed] cleaning database");
  await clean();

  console.log("[seed] creating users");
  const admin = await createUser(
    "admin@villagecaregiving.com",
    ADMIN_PASSWORD,
    "Sarah Admin",
    "ADMIN",
  );
  const marcus = await createUser(
    "marcus@example.com",
    CAREGIVER_PASSWORD,
    "Marcus Johnson",
    "CAREGIVER",
  );
  const priya = await createUser(
    "priya@example.com",
    CAREGIVER_PASSWORD,
    "Priya Patel",
    "CAREGIVER",
  );
  const dee = await createUser(
    "dee@example.com",
    CAREGIVER_PASSWORD,
    "Dee Washington",
    "CAREGIVER",
  );
  const caregivers = [marcus, priya, dee];

  console.log("[seed] creating clients");
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: "Eleanor Chen",
        address: "100 Main St, Barboursville, WV 25504",
        lat: 38.4099,
        lng: -82.2935,
        notes: "Loves crosswords. Cat allergies.",
      },
    }),
    prisma.client.create({
      data: {
        name: "Robert Kowalski",
        address: "245 Maple Ave, Huntington, WV 25701",
        lat: 38.4192,
        lng: -82.4452,
        notes: "Wheelchair access via side door.",
      },
    }),
    prisma.client.create({
      data: {
        name: "Margaret O'Brien",
        address: "78 Elm St, Barboursville, WV 25504",
        lat: 38.4118,
        lng: -82.296,
        notes: "Early-onset dementia. Prefers morning visits.",
      },
    }),
    prisma.client.create({
      data: {
        name: "James Wright",
        address: "401 Oak Ln, Milton, WV 25541",
        lat: 38.4257,
        lng: -82.1352,
        notes: "Diabetic. Meds at 8am and 8pm.",
      },
    }),
    prisma.client.create({
      data: {
        name: "Linda Foster",
        address: "12 Birch Way, Hurricane, WV 25526",
        lat: 38.4334,
        lng: -82.0143,
        notes: "Recovering from hip surgery.",
      },
    }),
  ]);

  console.log("[seed] creating shifts");
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Past 7 days: completed shifts with full EVV trace
  for (let day = -7; day <= -1; day++) {
    for (let i = 0; i < 2; i++) {
      const start = new Date(now.getTime() + day * dayMs);
      start.setHours(9 + i * 4, 0, 0, 0);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const caregiver = caregivers[Math.abs(day + i) % caregivers.length];
      const client = clients[Math.abs(day + i + 1) % clients.length];
      const jitter = () => (Math.random() - 0.5) * 0.0008;
      await prisma.shift.create({
        data: {
          caregiverId: caregiver.id,
          clientId: client.id,
          scheduledStart: start,
          scheduledEnd: end,
          status: "COMPLETED",
          clockInAt: new Date(start.getTime() - 4 * 60 * 1000),
          clockInLat: client.lat + jitter(),
          clockInLng: client.lng + jitter(),
          clockOutAt: new Date(end.getTime() + 2 * 60 * 1000),
          clockOutLat: client.lat + jitter(),
          clockOutLng: client.lng + jitter(),
          signedByName: client.name,
          signedAt: new Date(end.getTime() + 1 * 60 * 1000),
          tasks: {
            create: [
              {
                description: "Bathing assistance",
                completed: true,
                completedAt: new Date(start.getTime() + 30 * 60 * 1000),
                orderIdx: 0,
              },
              {
                description: "Light meal preparation",
                completed: true,
                completedAt: new Date(start.getTime() + 90 * 60 * 1000),
                orderIdx: 1,
              },
              {
                description: "Medication reminder",
                completed: true,
                completedAt: new Date(start.getTime() + 60 * 60 * 1000),
                orderIdx: 2,
              },
            ],
          },
        },
      });
    }
  }

  // Today: one in-progress + two scheduled
  for (let i = 0; i < 3; i++) {
    const start = new Date(now);
    start.setHours(9 + i * 3, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const status = i === 0 ? "IN_PROGRESS" : "SCHEDULED";
    const caregiver = caregivers[i % caregivers.length];
    const client = clients[(i + 2) % clients.length];
    await prisma.shift.create({
      data: {
        caregiverId: caregiver.id,
        clientId: client.id,
        scheduledStart: start,
        scheduledEnd: end,
        status,
        clockInAt: status === "IN_PROGRESS" ? new Date(start.getTime() + 2 * 60 * 1000) : null,
        clockInLat: status === "IN_PROGRESS" ? client.lat : null,
        clockInLng: status === "IN_PROGRESS" ? client.lng : null,
        tasks: {
          create: [
            { description: "Bathing assistance", orderIdx: 0 },
            { description: "Companionship + conversation", orderIdx: 1 },
          ],
        },
      },
    });
  }

  // Next 14 days: 2-3 scheduled shifts per day, variety of caregivers/clients
  for (let day = 1; day <= 14; day++) {
    const d = new Date(now.getTime() + day * dayMs);
    const numShifts = day % 7 === 0 ? 2 : 3; // 3 shifts/day except Sundays (2)
    for (let slot = 0; slot < numShifts; slot++) {
      const start = new Date(d);
      start.setHours(8 + slot * 4, 0, 0, 0);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const caregiver = caregivers[(day + slot) % caregivers.length];
      const client = clients[(day + slot) % clients.length];
      await prisma.shift.create({
        data: {
          caregiverId: caregiver.id,
          clientId: client.id,
          scheduledStart: start,
          scheduledEnd: end,
          status: "SCHEDULED",
          tasks: {
            create: [
              { description: "Bathing assistance", orderIdx: 0 },
              { description: "Light housekeeping", orderIdx: 1 },
              { description: "Meal preparation", orderIdx: 2 },
            ],
          },
        },
      });
    }
  }

  console.log("[seed] creating message threads");
  // Management thread (admins ↔ admins) — admin-only seed has just one member;
  // realistic prod would have multiple admins.
  await prisma.messageThread.create({
    data: {
      name: "Management",
      members: { create: [{ userId: admin.id }] },
    },
  });
  // DM thread between admin and each caregiver
  for (const cg of caregivers) {
    await prisma.messageThread.create({
      data: {
        members: { create: [{ userId: admin.id }, { userId: cg.id }] },
      },
    });
  }

  const shiftCount = await prisma.shift.count();
  console.log(`[seed] done (${shiftCount} shifts created)\n`);
  console.log("Login credentials:");
  console.log(`  Admin      admin@villagecaregiving.com / ${ADMIN_PASSWORD}`);
  console.log(`  Caregiver  marcus@example.com / ${CAREGIVER_PASSWORD}`);
  console.log(`  Caregiver  priya@example.com  / ${CAREGIVER_PASSWORD}`);
  console.log(`  Caregiver  dee@example.com    / ${CAREGIVER_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[seed] failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
