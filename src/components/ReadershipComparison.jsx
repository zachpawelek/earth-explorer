
import { useEffect, useState } from "react";
import {
  getCandidateReadership,
  rankReadershipPilot,
} from "../utils/pageViews.js";

export default function ReadershipComparison({ people }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const candidates = people.slice(0, 5);
    const ids = candidates.map((person) => person.id).join(",");

    getCandidateReadership(candidates, {
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted && data) {
        setResult({ ids, data });
      }
    });

    return () => controller.abort();
  }, [people]);

  const top = people.slice(0, 5);
  const ids = top.map((person) => person.id).join(",");

  const data =
    result?.ids === ids ? result.data : null;

  const pilotRanking = data
    ? rankReadershipPilot(top, data.byId)
    : [];

  const pilotWinner = pilotRanking[0] ?? null;

  return (
    <details className="city-discovery-note">
      <summary>Readership experiment (top 5)</summary>

      {!data && (
        <p>Checking English Wikipedia readership...</p>
      )}

      {data && (
        <>
          <p>
            {data.window.label} · English Wikipedia ·
            user-classified traffic
          </p>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", fontSize: "12px" }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>
                    Person
                  </th>
                  <th>12-month views</th>
                  <th>Trial score</th>
                </tr>
              </thead>

              <tbody>
                {top.map((person) => {
                  const views = data.byId[person.id];

                  const score = pilotRanking.find(
                    (p) => p.id === person.id
                  )?.pilotScore;

                  return (
                    <tr key={person.id}>
                      <td>{person.name}</td>

                      <td style={{ textAlign: "right" }}>
                        {views == null
                          ? "—"
                          : views.toLocaleString("en-US")}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {score == null
                          ? "—"
                          : `${score}/100`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pilotWinner && pilotRanking.length > 1 && (
            <p>
              Trial 50/50 sitelink + readership leader:
              {" "}{pilotWinner.name}.
              {pilotWinner.id !== top[0].id
                ? " This differs from the current selected person."
                : " This agrees with the current selected person."}
            </p>
          )}

          {pilotRanking.length < 2 && (
            <p>
              Too few candidates with complete readership
              data to compare.
            </p>
          )}

          {Object.keys(data.errors).length > 0 && (
            <p>
              Some requests failed; missing figures are
              shown as unavailable.
            </p>
          )}

          <p>
            Trial scores are relative to these candidates,
            not global Fame Index scores or confidence percentages.
            English readership favors English-speaking audiences.
            The selected person remains unchanged.
          </p>
        </>
      )}
    </details>
  );
}
