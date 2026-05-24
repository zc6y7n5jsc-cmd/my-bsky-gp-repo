'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * マウント時に Lazy Fetch（今日未記録なら同期）を行う。
 * synced=true のとき router.refresh() でサーバーコンポーネントを再実行。
 */
export function AutoSync({ did }: { did: string }) {
  const router = useRouter();

  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch(`/api/entries/${encodeURIComponent(did)}/sync`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.synced) router.refresh();
        }
      } catch {
        // バックグラウンド同期失敗は無視
      }
    }
    sync();
  }, [did, router]);

  return null;
}
