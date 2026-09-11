import test from "node:test";
import assert from "node:assert/strict";
import { inQuietHours, notificationDisposition } from "../src/lib/notification-rules.ts";
test("quiet hours handle overnight, daytime and disabled windows", () => {
  assert.equal(inQuietHours(23, 22, 7), true);
  assert.equal(inQuietHours(6, 22, 7), true);
  assert.equal(inQuietHours(7, 22, 7), false);
  assert.equal(inQuietHours(12, 9, 17), true);
  assert.equal(inQuietHours(19, 9, 17), false);
  assert.equal(inQuietHours(12, 7, 7), false);
});
test("snoozing and dismissing updates are independent of read or task status", () => {
  assert.equal(notificationDisposition(undefined, 1000), "active");
  assert.equal(
    notificationDisposition(
      { dismissed: false, snoozed_until: new Date(2000).toISOString() },
      1000,
    ),
    "snoozed",
  );
  assert.equal(
    notificationDisposition(
      { dismissed: false, snoozed_until: new Date(2000).toISOString() },
      2000,
    ),
    "active",
  );
  assert.equal(notificationDisposition({ dismissed: true, snoozed_until: null }, 1000), "done");
});
