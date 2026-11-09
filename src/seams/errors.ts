/**
 * What a seam says when nothing has implemented it yet.
 *
 * A seam is a signature the rest of the app is written against from day one.
 * Before the component that implements it is installed, calling it has to fail
 * in a way that tells you exactly what to do — not `undefined is not a
 * function`, and not a silent no-op, which is far worse: an audit log that
 * quietly does nothing looks identical to one that works.
 *
 * The message names the component in the words the library uses for it, so it
 * can be searched for in the library screen without translation.
 */
export class SeamNotImplemented extends Error {
  readonly seam: string;
  readonly componentId: string;
  readonly componentName: string;

  constructor(seam: string, componentName: string, componentId: string) {
    super(
      `"${seam}" needs the ${componentName} component, which is not installed yet. ` +
        `Install "${componentId}" from the Shipyard library — do not write your own.`,
    );
    this.name = 'SeamNotImplemented';
    this.seam = seam;
    this.componentId = componentId;
    this.componentName = componentName;
  }
}

/**
 * Marks a file as an unimplemented seam stub.
 *
 * Shipyard reads this to tell a stub from code somebody has written. That
 * matters at install time: a component may replace a stub silently, because
 * replacing a stub takes nothing away, while overwriting a file the founder
 * wrote is refused. Removing this line from a file opts it out of being
 * replaced.
 */
export const SHIPYARD_SEAM_STUB = true;
