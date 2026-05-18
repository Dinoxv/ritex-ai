# Loading Freeze Runbook

![Toilabap Logo](toilabap.com/toilabap.com-logo-dark.svg)
![Toilabap Icon](toilabap.com/toilabap.com-icon.svg)

## Trieu chung

- App bi treo o loading state sau deploy/hard refresh.
- Console bao chunk load error hoac static asset mismatch.

## Nguyen nhan thuong gap

- Build artifact va deployment ID khong dong bo.
- Browser giu cache hash cu.
- Runtime update race trong khoang swap artifact.

## Xu ly nhanh

1. Kiem tra PM2 process dang chay dung env.
2. Kiem tra NEXT_DEPLOYMENT_ID tai runtime.
3. Hard reload kem cache clear.
4. Neu can, restart frontend process.

## Deploy dung chuan

```bash
cd /root/hyperscalper
npm run deploy:pm2
```

Flow nay giup rotate deployment ID va restart theo quy trinh an toan.

## Hardening bat buoc

- Co chunk-load recovery (chi reload mot lan).
- Co retry window de tranh reload loop.
- Co telemetry de theo doi tan suat tai phat.
