/**
 * Cosmic analogues: observational physics phenomena mapped to LIGS archetypes.
 * Used to ground RAW SIGNAL and ORACLE in factual astronomical/cosmological language.
 */

import type { LigsArchetype } from "../voice/schema";
import { LIGS_ARCHETYPES } from "../archetypes/contract";

export interface CosmicAnalogue {
  phenomenon: string;
  description: string;
  lightBehaviorKeywords: string[];
}

/** Archetype → cosmic analogue (observational, physics tone). */
export const COSMIC_ANALOGUES: Record<LigsArchetype, CosmicAnalogue> = {
  Ignispectrum: {
    phenomenon: "protostar ignition + bipolar jets",
    description:
      "A collapsing cloud reaches critical density; nuclear ignition begins at the core. Collimated outflows along the rotational axis carry angular momentum away. The system transitions from accretion-dominated to radiation-dominated.",
    lightBehaviorKeywords: ["collimated outflow", "core ignition", "bipolar symmetry", "accretion-to-radiation"],
  },
  Stabiliora: {
    phenomenon: "globular cluster",
    description:
      "Tens of thousands to millions of stars orbit a common center of mass. Dynamical relaxation over gigayears yields a stable, roughly spherical distribution. High stellar density near the core; velocity dispersion maintains equilibrium.",
    lightBehaviorKeywords: ["gravitational equilibrium", "dense core", "multi-body stability", "relaxation"],
  },
  Duplicaris: {
    phenomenon: "eclipsing binary",
    description:
      "Two stars orbit a common barycenter. When one passes in front of the other, observed flux drops. The light curve encodes orbital period, inclination, and relative sizes. Symmetry emerges from the paired geometry.",
    lightBehaviorKeywords: ["orbital phase", "mutual eclipse", "paired geometry", "periodic modulation"],
  },
  Tenebris: {
    phenomenon: "gravitational lensing (hidden mass shaping light)",
    description:
      "Mass curves spacetime; light follows geodesics. A foreground mass deflects light from a background source. The lens reveals its presence through distortion and magnification, not direct emission.",
    lightBehaviorKeywords: ["deflection", "hidden mass", "geodesic bending", "indirect reveal"],
  },
  Radiantis: {
    phenomenon: "starburst region",
    description:
      "Intense star formation in a confined volume. Young, massive stars dominate the spectrum; UV ionizes surrounding gas. H II regions glow; the region outshines the host galaxy in specific bands.",
    lightBehaviorKeywords: ["high surface brightness", "ionization", "youth-dominated", "localized intensity"],
  },
  Precisura: {
    phenomenon: "pulsar",
    description:
      "A rotating neutron star beams radiation along magnetic poles. The period is stable to high precision; timing residuals can detect planetary companions. Regularity encodes extreme compactness and conservation of angular momentum.",
    lightBehaviorKeywords: ["periodic precision", "beamed emission", "timing stability", "compact spin"],
  },
  Aequilibris: {
    phenomenon: "Lagrange equilibrium",
    description:
      "In the circular restricted three-body problem, five points allow a test mass to orbit with the same period as the secondary. L4 and L5 are stable; small perturbations oscillate but do not grow.",
    lightBehaviorKeywords: ["gravitational balance", "co-orbital stability", "libration", "three-body equilibrium"],
  },
  Obscurion: {
    phenomenon: "dark nebula / molecular cloud",
    description:
      "Dense gas and dust absorb and scatter background light. Structure is inferred from silhouette against emission or from millimeter observations of molecular tracers. Opacity defines form.",
    lightBehaviorKeywords: ["absorption", "silhouette", "dense opacity", "structure by absence"],
  },
  Vectoris: {
    phenomenon: "relativistic jet",
    description:
      "Collimated plasma flows at near-light speed from an accreting compact object. Lorentz factor amplifies apparent brightness; beaming produces one-sided or asymmetric appearance. Direction is fixed by spin and magnetic geometry.",
    lightBehaviorKeywords: ["collimated flow", "relativistic beaming", "directional momentum", "one-sided emission"],
  },
  Structoris: {
    phenomenon: "cosmic web filaments",
    description:
      "Large-scale structure forms a network of filaments connecting nodes. Gas flows along filaments into halos; the geometry channels accretion. The skeleton traces the gravitational potential.",
    lightBehaviorKeywords: ["filamentary network", "skeletal geometry", "accretion channels", "large-scale topology"],
  },
  Innovaris: {
    phenomenon: "supernova shock front",
    description:
      "The blast wave sweeps through circumstellar or interstellar material. Compressed gas radiates; the shock accelerates particles. The interface between ejecta and ambient medium defines a sharp boundary that evolves.",
    lightBehaviorKeywords: ["shock compression", "blast interface", "sudden transition", "evolving boundary"],
  },
  Fluxionis: {
    phenomenon: "accretion disk / spiral flow",
    description:
      "Matter spirals inward under angular momentum transport. Viscosity and turbulence drive the flow; the disk radiates as it heats. Spiral structure can arise from density waves or dynamical instabilities.",
    lightBehaviorKeywords: ["spiral inflow", "angular momentum transport", "viscous flow", "disk radiation"],
  },
};

export function getCosmicAnalogue(archetype: LigsArchetype): CosmicAnalogue {
  return COSMIC_ANALOGUES[archetype] ?? COSMIC_ANALOGUES.Stabiliora;
}

/** All archetypes in canonical order. */
export const COSMIC_ARCHETYPES = LIGS_ARCHETYPES;
