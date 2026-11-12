import { useEffect, useState } from "react";
import { getWikipediaPortrait } from "../utils/personImages.js";

export default function PersonPortrait({ person }) {
  const [result, setResult] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const key = `${person.id}|${person.enwikiTitle ?? ""}`;

  useEffect(() => {
    const controller = new AbortController();

    getWikipediaPortrait(person, { signal: controller.signal })
      .then((portrait) => {
        if (!controller.signal.aborted) {
          setResult({ key, portrait });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          console.warn("Wikipedia portrait unavailable:", error);
          setResult({ key, portrait: null });
        }
      });

    return () => controller.abort();
  }, [key, person]);

  const loaded = result?.key === key;
  const portrait = loaded ? result.portrait : null;
  const showImage = portrait && failedSrc !== portrait.src;

  return (
    <figure className="person-portrait">
      {showImage ? (
        <a
          href={portrait.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read about ${person.name} on Wikipedia`}
        >
          <img
            src={portrait.src}
            alt={`Wikipedia article image for ${person.name}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(portrait.src)}
          />
        </a>
      ) : (
        <div className="person-portrait-placeholder" role="status">
          {loaded ? "No photo available" : "Loading photo…"}
        </div>
      )}
      {showImage && (
        <figcaption>
          <a
            href={portrait.filePageUrl ?? portrait.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Image details &amp; license
          </a>
        </figcaption>
      )}
    </figure>
  );
}
