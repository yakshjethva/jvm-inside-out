import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { PROJECT_STATUS } from '@/content/status';
import { SITE } from '@/data/site';
import { usePageTitle } from '@/hooks/usePageTitle';

function Block({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-ink-700 py-8 first:border-t-0">
      <h2 className="font-serif text-[26px] text-fg">{title}</h2>
      <div className="prose-ij mt-3 max-w-3xl text-[15.5px]">{children}</div>
    </section>
  );
}

export function AboutPage() {
  usePageTitle('About');
  return (
    <>
      <PageHeader kicker="About" title="Don't memorize the JVM. Explore it.">
        <p>
          JVM Atlas is an open-source, interactive atlas of the Java Virtual Machine. It is built
          for people who want an accurate mental model of how Java actually runs, from absolute
          beginners to engineers preparing for JVM interviews.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6">
        <Block title="Why it exists">
          <p>
            Most explanations of the JVM are a rectangle with six smaller rectangles inside. That
            picture hides what matters: how the parts depend on each other, which parts the
            specification requires and which are one implementation's choices, and what actually
            happens when a line of Java runs.
          </p>
          <p>
            JVM Atlas starts with a question a beginner already has, follows one small program
            through the machine, and then lets you take the machine apart. Every part is selectable,
            connected and dissected, explained simply and in depth (with a developer level for the
            core concepts and the first lesson), and every walkthrough uses real output from a real
            JDK.
          </p>
        </Block>
        <Block title="Versions">
          <ul>
            <li>
              <strong>Specification baseline:</strong> {SITE.specVersion} (Java Virtual Machine
              Specification and Java Language Specification).
            </li>
            <li>
              <strong>Implementation details:</strong> {SITE.implementationVersion}, checked against
              the OpenJDK source tag <code>jdk-25-ga</code>.
            </li>
            <li>
              <strong>Verified examples:</strong> compiled and run with OpenJDK 25.0.4 on Linux x64
              (4 CPUs). Flag defaults come from <code>-XX:+PrintFlagsFinal</code> on that machine;
              some are chosen ergonomically and differ on yours.
            </li>
          </ul>
        </Block>
        <Block title="Accuracy policy">
          <ul>
            <li>
              Specification concepts and HotSpot implementation structures are always distinguished
              (solid versus dashed outlines, and labels).
            </li>
            <li>
              Bytecode is real <code>javap</code> output; it is never written by hand.
            </li>
            <li>
              Every diagram, dissection and walkthrough carries a visible accuracy note saying what
              it simplifies.
            </li>
            <li>
              Simulations and walkthroughs are educational models of JVM behaviour, not the JVM
              itself, and say so.
            </li>
            <li>
              Technically important claims cite primary sources: see the{' '}
              <Link to="/references">references</Link>.
            </li>
          </ul>
          <p>
            Found an error? Please <a href={`${SITE.repository}/issues`}>open an issue</a> with a
            source. Corrections are the most valuable contribution.
          </p>
        </Block>
        <Block title="Project status" id="project-status">
          <p>
            JVM Atlas is built one milestone at a time, and only finished experiences are linked
            from the site. This is where things stand.
          </p>
          <table className="mt-4 w-full border-collapse text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-ink-600 text-[13px] text-fg-subtle">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Experience
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">
                  What you do
                </th>
                <th scope="col" className="py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_STATUS.map((item) => (
                <tr key={item.name} className="border-b border-ink-700 align-top">
                  <td className="py-2.5 pr-4 text-fg">
                    {item.to ? <Link to={item.to}>{item.name}</Link> : item.name}
                    <span className="mt-0.5 block text-[13px] text-fg-muted sm:hidden">
                      {item.what}
                    </span>
                  </td>
                  <td className="hidden py-2.5 pr-4 text-fg-muted sm:table-cell">{item.what}</td>
                  <td className="py-2.5 whitespace-nowrap">
                    {item.to ? (
                      <Badge tone="ok">Available</Badge>
                    ) : (
                      <Badge>In development · {item.milestone}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            The source code, the plan and every change are public in the{' '}
            <a href={SITE.repository}>repository on GitHub</a>.
          </p>
        </Block>
        <Block title="Privacy and hosting">
          <p>
            The site is static files on GitHub Pages: no backend, no accounts, no analytics, no
            cookies, no third-party requests. Progress, bookmarks and preferences live in your
            browser's localStorage and never leave your device. You can clear them from the learning
            preferences menu in the header.
          </p>
        </Block>
        <Block title="Open source">
          <p>
            The code and content are MIT licensed. Fonts (Inter, JetBrains Mono, Source Serif 4) are
            bundled under the SIL Open Font License. Third-party licenses are listed in{' '}
            <code>THIRD_PARTY_NOTICES.md</code> in the <a href={SITE.repository}>repository</a>.
            {SITE.independence} {SITE.trademarks} JVM Atlas is not part of the OpenJDK project.
          </p>
        </Block>
      </div>
    </>
  );
}
