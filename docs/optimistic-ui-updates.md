# Optimistic UI Updates - Trading UX Policy

![Toilabap Logo](toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](toilabap.com/toilabap.com-icon.svg)

## Muc tieu

Giam do tre cam nhan khi trader thao tac, nhung van bao toan tinh dung cua trang thai he thong.

## Nguyen tac

- Render pending ngay lap tuc.
- Chuyen sang confirmed khi co ACK tu API.
- Reconcile lien tuc voi server state qua poll/ws.
- Rollback ro rang neu request that bai.

## State model

- pending: style nhan biet ro (opacity/dashed).
- confirmed: style chuan va co timestamp.
- rejected: remove/revert + thong bao ly do.

## Safety rules

- Bat buoc idempotency key moi action.
- Cam duplicate order object khi retry.
- Hien thi ro optimistic state khac actual state.
