"use client";

import { useActionState } from "react";
import { CheckCircle2, Clock3, LogOut, UserPlus, XCircle } from "lucide-react";
import { cancelGroupAction, joinGroupAction, leaveGroupAction, type GroupActionState } from "@/app/groups/actions";

function ActionFeedback({ state }: { state: GroupActionState }) {
  if (state.error) return <p className="group-action-feedback group-action-feedback--error" role="alert">{state.error}</p>;
  if (state.message) return <p className="group-action-feedback group-action-feedback--success" role="status"><CheckCircle2 size={15} /> {state.message}</p>;
  return null;
}

export default function GroupMembershipActions({
  groupId,
  groupStatus,
  membershipStatus,
  isOwner,
}: {
  groupId: string;
  groupStatus: string;
  membershipStatus?: string | null;
  isOwner: boolean;
}) {
  const [joinState, joinFormAction, isJoining] = useActionState(joinGroupAction, {});
  const [leaveState, leaveFormAction, isLeaving] = useActionState(leaveGroupAction, {});
  const [cancelState, cancelFormAction, isCancelling] = useActionState(cancelGroupAction, {});
  const isClosed = groupStatus === "cancelled" || groupStatus === "completed";
  const isRegistered = membershipStatus === "registered";
  const isWaitlisted = membershipStatus === "waitlisted";

  return (
    <div className="group-actions">
      {isOwner ? (
        <>
          <span className="group-owner-badge">คุณเป็นผู้จัดก๊วน</span>
          {!isClosed ? (
            <form action={cancelFormAction}>
              <input type="hidden" name="groupId" value={groupId} />
              <button type="submit" className="group-danger-action" disabled={isCancelling}>
                <XCircle size={16} /> {isCancelling ? "กำลังยกเลิก..." : "ยกเลิกก๊วน"}
              </button>
            </form>
          ) : null}
          <ActionFeedback state={cancelState} />
        </>
      ) : isRegistered || isWaitlisted ? (
        <>
          <span className={isRegistered ? "group-membership-pill group-membership-pill--registered" : "group-membership-pill group-membership-pill--waitlisted"}>
            {isRegistered ? <CheckCircle2 size={16} /> : <Clock3 size={16} />} {isRegistered ? "เข้าร่วมแล้ว" : "อยู่ในคิวรอ"}
          </span>
          {!isClosed ? (
            <form action={leaveFormAction}>
              <input type="hidden" name="groupId" value={groupId} />
              <button type="submit" className="group-secondary-action" disabled={isLeaving}><LogOut size={15} /> {isLeaving ? "กำลังออก..." : "ออกจากก๊วน"}</button>
            </form>
          ) : null}
          <ActionFeedback state={leaveState} />
        </>
      ) : (
        <>
          <form action={joinFormAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <button type="submit" className="group-primary-action" disabled={isJoining || isClosed}>
              {isJoining ? "กำลังเข้าร่วม..." : groupStatus === "full" ? <><Clock3 size={16} /> เข้าคิวรอ</> : <><UserPlus size={16} /> เข้าร่วมก๊วน</>}
            </button>
          </form>
          <ActionFeedback state={joinState} />
        </>
      )}
    </div>
  );
}
