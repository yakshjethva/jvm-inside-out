import { Compass, X } from 'lucide-react';
import { Link } from 'react-router';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SourceList } from '@/components/learning/SourceReference';
import {
  CLASS_LOADING_LISTINGS,
  LOADER_PROFILES,
  LOADER_WORLD,
  type LoaderId,
} from '@/content/labs/classLoading';
import { getComponentDoc } from '@/content/jvm';
import { usePreferences } from '@/hooks/useLearningState';
import type { LoaderRuntime } from '@/simulators/classLoading';
import { shortId } from './narration';

/** What the selected loader is responsible for, where it looks, what it holds, and the evidence. */
export function LoaderInspector({
  id,
  runtime,
  onClose,
  onSelect,
}: {
  id: LoaderId;
  runtime: LoaderRuntime;
  onClose: () => void;
  onSelect: (id: LoaderId) => void;
}) {
  const { preferences } = usePreferences();
  const profile = LOADER_PROFILES[id];
  const spec = LOADER_WORLD.loaders.find((l) => l.id === id)!;
  const children = LOADER_WORLD.loaders.filter((l) => l.parent === id);
  const defined = runtime.classes.filter((c) => c.definingLoader === id);
  const recorded = Object.values(runtime.initiated[id] ?? {}).filter(
    (classId) => !defined.some((c) => c.id === classId),
  );
  const owns = LOADER_WORLD.modules.filter((m) => m.loader === id).map((m) => m.name);

  return (
    <section
      aria-labelledby={`inspect-${id}`}
      className="rounded-xl border border-ink-600 bg-ink-900/60 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-fg-subtle">{profile.kindLabel}</p>
          <h3 id={`inspect-${id}`} className="font-serif text-[24px] leading-tight text-fg">
            {profile.title}
          </h3>
          <p className="mt-0.5 font-mono text-[12.5px] break-words text-fg-subtle" translate="no">
            {profile.implementation}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the loader details"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-600 text-fg-muted hover:text-fg"
        >
          <X size={15} aria-hidden />
        </button>
      </div>

      <div className="mt-3">
        <LevelText content={profile.role} level={preferences.level} className="prose-ij" />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2.5 text-[14px] sm:grid-cols-2">
        <div>
          <dt className="text-[12.5px] text-fg-subtle">In Java code</dt>
          <dd className="font-mono text-[12.5px] break-words text-fg" translate="no">
            {profile.javaView}
          </dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-fg-subtle">Parent</dt>
          <dd className="text-fg">
            {spec.parent ? (
              <button
                type="button"
                onClick={() => onSelect(spec.parent as LoaderId)}
                className="min-h-6 text-left text-exec-300 underline underline-offset-2 hover:text-exec-200"
              >
                {LOADER_PROFILES[spec.parent as LoaderId].title}
              </button>
            ) : (
              'None: it is the root'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-fg-subtle">Searches</dt>
          <dd className="text-fg">{profile.scope}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-fg-subtle">Order</dt>
          <dd className="text-fg">{profile.policyLabel}</dd>
        </div>
        {owns.length > 0 && (
          <div>
            <dt className="text-[12.5px] text-fg-subtle">Modules defined to it (in this lab)</dt>
            <dd className="font-mono text-[12.5px] text-fg" translate="no">
              {owns.join(', ')}
            </dd>
          </div>
        )}
        {children.length > 0 && (
          <div>
            <dt className="text-[12.5px] text-fg-subtle">Loaders that name it as parent</dt>
            <dd className="flex flex-wrap gap-x-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelect(child.id as LoaderId)}
                  className="min-h-6 text-left text-exec-300 underline underline-offset-2 hover:text-exec-200"
                >
                  {LOADER_PROFILES[child.id as LoaderId].title}
                </button>
              ))}
            </dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-[12.5px] text-fg-subtle">Classes it holds now</dt>
          <dd className="text-fg">
            {defined.length === 0 && recorded.length === 0 ? (
              <span className="text-fg-muted">
                None yet. Send it a request in the delegation laboratory.
              </span>
            ) : (
              <span className="font-mono text-[12.5px] break-words" translate="no">
                {[
                  ...defined.map((c) => `${shortId(c.id)} (defined)`),
                  ...recorded.map((r) => `${shortId(r)} (initiated)`),
                ].join(' · ')}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {profile.evidence.length > 0 && (
        <div className="mt-5 space-y-3">
          <h4 className="text-[14px] font-medium text-fg-muted">Evidence from a real JVM</h4>
          {profile.evidence.map((listingId) => {
            const listing = CLASS_LOADING_LISTINGS[listingId]!;
            return (
              <CodeBlock
                key={listing.id}
                code={listing.code}
                language={listing.language}
                title={listing.title}
                verifiedWith={listing.verifiedWith}
              />
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <h4 className="mb-2 text-[14px] font-medium text-fg-muted">Sources</h4>
        <SourceList citations={profile.references} />
      </div>
      <Link
        to={`/anatomy?c=${profile.component}`}
        className="mt-4 inline-flex min-h-6 items-center gap-2 text-[14.5px] text-exec-300 underline underline-offset-4 hover:text-exec-200"
      >
        <Compass size={15} aria-hidden />
        {getComponentDoc(profile.component).name} on the JVM map
      </Link>
    </section>
  );
}
