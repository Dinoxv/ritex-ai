# Restore v2.1 - Runtime Recovery Procedure

## Muc tieu

Khoi phuc nhanh mot ban on dinh ma khong pha vo deployment guardrails.

## Pre-check bat buoc

1. Xac nhan commit/tag dich can restore.
2. Backup env, PM2 ecosystem, va runtime config.
3. Kiem tra process map va port map hien tai.

## Quy trinh restore

```bash
cd /root/hyperscalper
git fetch --all --tags
git checkout <stable-tag-or-commit>
npm install
npm run build
pm2 restart hyperscalper-frontend --update-env
```

## Post-restore validation

- Route chinh render binh thuong.
- Timeframe switch khong crash.
- Trend Matrix overlays load dung du lieu.
- Scanner cycle co output + metrics.
- NEXT_DEPLOYMENT_ID hien dien trong runtime.

## Neu con loading freeze

- Kiem tra mismatch giua build artifact va cache.
- Thuc hien hard reload cache-bust.
- Chay theo runbook: docs/LOADING_FREEZE_RUNBOOK.md

## Roll-forward strategy

- Tao nhanh branch hotfix tu moc vua restore.
- Chi cherry-pick thay doi can thiet.
- Deploy qua luong deploy:pm2 de giu tinh dong bo.
