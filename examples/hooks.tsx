/**
 * The exact "React Hooks" code sample from README.md, kept here so it is
 * typechecked by `npm run typecheck` (and therefore CI) — a change that
 * breaks this file means the README's code sample no longer compiles.
 */
import { SoroTipClient, useProfile, useTipHistory, useTopCreators } from "../src/index";

const client = new SoroTipClient({ network: "testnet", contractId: "CA..." });

export function CreatorPage({ wallet }: { wallet: string }) {
  const { profile, isLoading, refetch } = useProfile(client, wallet);
  const { tips } = useTipHistory(client, wallet, 10);

  if (isLoading) return <p>Loading...</p>;
  return (
    <div>
      <h1>{profile?.name}</h1>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {tips?.map((t) => (
          <li key={t.id}>{t.amount}</li>
        ))}
      </ul>
    </div>
  );
}

export function Leaderboard() {
  const { creators } = useTopCreators(client, 6);
  return (
    <ul>
      {creators?.map((c) => (
        <li key={c.wallet}>{c.name}</li>
      ))}
    </ul>
  );
}
