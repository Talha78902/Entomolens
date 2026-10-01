export interface KeyResult {
  title: string
  emoji: string
  description: string
  examples: Array<{ label: string; q: string }>
  beneficial?: boolean
  links?: Array<{ label: string; to: string }>
}

export interface KeyOption {
  label: string
  hint?: string
  next?: string
  result?: KeyResult
}

export interface KeyNode {
  id: string
  question: string
  options: KeyOption[]
}

export const IDENTIFICATION_KEY: KeyNode[] = [
  {
    id: 'wings',
    question: 'As an adult, does it have functional wings?',
    options: [
      { label: 'No wings', hint: 'Wingless at all adult stages', next: 'wingless' },
      { label: 'One pair of wings', hint: 'Only two functional wings', next: 'onepair' },
      { label: 'Two pairs of wings', hint: 'Four wings, in two pairs', next: 'twopairs' },
    ],
  },
  {
    id: 'wingless',
    question: 'Does it have three long tail filaments and a flattened, silvery body?',
    options: [
      {
        label: 'Yes — silvery, flattened, hopping', hint: 'Bristletail / silverfish look',
        result: {
          title: 'Order Zygentoma (bristletails / silverfish)',
          emoji: '🪱',
          description:
            'Primitive insects with a flattened, silvery body, long antennae and three tail filaments. They are mostly scavengers, not crop pests.',
          examples: [{ label: 'Browse the museum', q: 'silverfish' }],
        },
      },
      {
        label: 'No, but it is small and soft-bodied', hint: 'Soft body, no wings',
        result: {
          title: 'Order Hemiptera — apterous true bugs',
          emoji: '🐜',
          description:
            'Many true bugs such as aphids and scale insects are wingless as adults or have winged and wingless forms. Soft-bodied, sap-feeding, often clustering on new growth.',
          beneficial: false,
          examples: [
            { label: 'Aphids', q: 'aphid' },
            { label: 'Whiteflies', q: 'whitefly' },
          ],
        },
      },
      {
        label: 'No — pale, soft-bodied, soil-dwelling, colonial', hint: 'Living in soil galleries',
        result: {
          title: 'Termites / ants (colonial wingless workers)',
          emoji: '🏗️',
          description:
            'Pale, soft-bodied workers without wings that tunnel in soil and girdle stems near the ground line. Castes with soldiers are characteristic of eusocial colonies.',
          beneficial: false,
          examples: [{ label: 'Browse the museum', q: 'termite' }],
        },
      },
    ],
  },
  {
    id: 'onepair',
    question: 'Behind each visible wing is there a tiny knob-like organ (a haltere)?',
    options: [
      {
        label: 'Yes — halteres present', hint: 'Two functional wings + halteres',
        result: {
          title: 'Order Diptera (true flies)',
          emoji: '🪰',
          description:
            'Flies have only the forewings functional; the hindwings are reduced to balancing knobs (halteres). Includes hoverflies (Syrphidae), whose larvae are aphid predators.',
          beneficial: false,
          examples: [
            { label: 'Hoverflies — beneficial', q: 'hoverfly' },
            { label: 'Fruit flies', q: 'fruit fly' },
          ],
        },
      },
      {
        label: 'No halteres', hint: 'Something else entirely',
        result: {
          title: 'Not a typical fly — consider the museum',
          emoji: '🔍',
          description:
            'Insects with a single pair of wings but no halteres are unusual. It may be a winged adult of an order with modified hindwings, or a damaged specimen. Use the museum search or AI identify.',
          examples: [{ label: 'Open the museum', q: '' }],
        },
      },
    ],
  },
  {
    id: 'twopairs',
    question: 'What do the front wings look like?',
    options: [
      {
        label: 'Hardened, sheath-like, meeting in a straight line',
        hint: 'Elytra — no visible veins',
        result: {
          title: 'Order Coleoptera (beetles)',
          emoji: '🐞',
          description:
            'Front wings are hardened elytra covering the folded membranous hindwings. Includes ladybird beetles (Coccinellidae) — voracious predators of aphids and scales.',
          beneficial: true,
          examples: [
            { label: 'Ladybird beetles — beneficial', q: 'ladybird' },
            { label: 'Browse beetles', q: 'beetle' },
          ],
        },
      },
      {
        label: 'Leathery at the base, membranous at the tip',
        hint: 'Hemelytra — true bug style',
        next: 'hemiptera_mouth',
      },
      {
        label: 'Covered with tiny overlapping scales',
        hint: 'Powdery dust comes off the wings',
        result: {
          title: 'Order Lepidoptera (moths & butterflies)',
          emoji: '🦋',
          description:
            'Wings are covered in microscopic scales that come off as dust. Includes moths whose caterpillars are major crop pests, e.g. cotton bollworm, pink bollworm, fall armyworm.',
          beneficial: false,
          examples: [
            { label: 'Pink bollworm', q: 'pink bollworm' },
            { label: 'Fall armyworm', q: 'armyworm' },
            { label: 'Tomato fruit borer', q: 'fruit borer' },
          ],
        },
      },
      {
        label: 'Narrow-waisted body with a tiny petiole', hint: 'Bee / wasp / ant silhouette',
        result: {
          title: 'Order Hymenoptera (bees, wasps, ants)',
          emoji: '🐝',
          description:
            'Two pairs of membranous wings and a characteristic narrow waist. Includes pollinators (bees) and parasitoid wasps such as Trichogramma and Encarsia that regulate pests.',
          beneficial: true,
          examples: [
            { label: 'Honeybees — pollinators', q: 'honeybee' },
            { label: 'Parasitoid wasps — beneficial', q: 'parasitoid' },
          ],
        },
      },
      {
        label: 'Long, narrow, translucent, held roof-like at rest',
        hint: 'Delicate net-veined wings',
        result: {
          title: 'Order Neuroptera (lacewings)',
          emoji: '🕸️',
          description:
            'Lacewings have large, delicate, many-veined wings held tent-like. Green lacewing (Chrysoperla) larvae — "aphid lions" — are outstanding biological-control predators.',
          beneficial: true,
          examples: [{ label: 'Green lacewing — beneficial', q: 'lacewing' }],
        },
      },
      {
        label: 'Huge eyes, long slender abdomen, wings stuck out flat',
        hint: 'Dragonfly silhouette',
        result: {
          title: 'Order Odonata (dragonflies & damselflies)',
          emoji: '🐉',
          description:
            'Fast-flying predators with enormous compound eyes and delicate net-veined wings held out flat. Adults and nymphs are highly beneficial, feeding on flies and mosquitoes.',
          beneficial: true,
          examples: [{ label: 'Browse the museum', q: 'dragonfly' }],
        },
      },
    ],
  },
  {
    id: 'hemiptera_mouth',
    question: 'Do the mouthparts form a slender beak pointing forward from the front of the head?',
    options: [
      {
        label: 'Yes — a distinct beak, body pear-shaped or oval',
        hint: 'Piercing-sucking rostrum',
        result: {
          title: 'Order Hemiptera (true bugs)',
          emoji: '🪲',
          description:
            'True bugs have forewings that are partly hardened and partly membranous, folded flat over the back, plus piercing-sucking mouthparts forming a forward beak. Includes aphids, leafhoppers, whiteflies, scale insects, mealybugs and cotton stainer bugs.',
          beneficial: false,
          examples: [
            { label: 'Aphids', q: 'aphid' },
            { label: 'Leafhoppers (jassids)', q: 'jassid' },
            { label: 'Whiteflies', q: 'whitefly' },
            { label: 'Cotton mealybug', q: 'mealybug' },
            { label: 'Red cotton stainer', q: 'stainer' },
          ],
        },
      },
      {
        label: 'No beak — mouthparts hidden or of another type',
        hint: 'Wing pattern may be misleading',
        result: {
          title: 'Not a typical true bug — check another order',
          emoji: '🔍',
          description:
            'Wings that looked leathery at the base without a forward-pointing beak may belong to another group, or to a beetle with a partly hardened thorax rather than true hemelytra. Use the museum filters to confirm the order.',
          beneficial: false,
          examples: [{ label: 'Open the museum', q: '' }],
        },
      },
    ],
  },
]

export interface KeyProgress {
  nodeId: string
  chosenLabel: string
}

export function resolveOption(nodeId: string, optionIndex: number): KeyOption | null {
  const node = IDENTIFICATION_KEY.find((entry) => entry.id === nodeId)
  return node?.options[optionIndex] ?? null
}

function depthFrom(nodeId: string, seen: Set<string>): number {
  if (seen.has(nodeId)) return 0
  seen.add(nodeId)
  const node = IDENTIFICATION_KEY.find((entry) => entry.id === nodeId)
  if (!node) return 0
  let deepest = 1
  for (const option of node.options) {
    if (option.next) {
      deepest = Math.max(deepest, 1 + depthFrom(option.next, seen))
    }
  }
  return deepest
}

export const KEY_MAX_DEPTH = Math.max(
  1,
  ...IDENTIFICATION_KEY.map((node) => depthFrom(node.id, new Set())),
)

export function getKeyNode(nodeId: string): KeyNode | null {
  return IDENTIFICATION_KEY.find((entry) => entry.id === nodeId) ?? null
}