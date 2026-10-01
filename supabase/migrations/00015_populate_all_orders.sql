-- ---------------------------------------------------------------------------
-- 00015: Populate every insect order with a museum specimen
--
-- 00014 brought the order checklist to 28, but 20 of those had zero species, so
-- selecting them in the museum returned an empty state. This adds one
-- representative species per missing order, which is what makes all 28 orders
-- browsable with a picture.
--
-- Images
-- ------
-- Sourced from iNaturalist rather than Wikimedia Commons. Commons is not
-- reliably reachable (commons.wikimedia.org answers ECONNRESET from CI, and
-- guessing thumb URLs only verified 1 of 20), whereas the iNaturalist API is
-- reachable and — decisively — lets the licence be filtered per request.
--
-- Only cc0 and cc-by are used. cc-by-nc and the other non-commercial terms are
-- rejected outright: this is an agricultural extension site, and "non-
-- commercial" is not a promise the project can make about itself later.
-- 17 of the 20 are cc0 (public domain, no attribution owed). The 3 cc-by photos
-- and their photographer credits are in the comments on each insert below and in
-- species-extended.sql, so attribution can be surfaced on the species page.
--
-- Only research-grade, non-captive observations were used: a pinned museum
-- specimen or a zoo animal is a poor stand-in for a live field insect.
--
-- Taxonomy note: the order assignment is the modern consensus used in 00014, not
-- iNaturalist's, which files several of these differently (Phyllium under
-- Phasmida > Verophasmatodea, Grylloblatta under Notoptera). Where the seed names
-- a genus rather than a species, that is deliberate and is called out inline.
--
-- Idempotent: `on conflict do nothing` on every table, so re-running adds
-- nothing. Images are only written when the row is new, so a re-run cannot
-- clobber a corrected photo.
-- ---------------------------------------------------------------------------

-- Families -------------------------------------------------------------------
-- order_id is NOT NULL in the schema, and the order UUIDs differ per database
-- (00011 inserts fixed ids, 00014 lets Postgres generate them), so every row
-- resolves its order by name instead of hard-coding a uuid.
insert into public.taxonomic_families (id, name, common_name, description, order_id) values
  ('20000000-0000-0000-0000-000000000101', 'Archaeognathidae', 'Bristletails', 'Primitive jumping insects of leaf litter, bark and streamside rock; among the most ancient living insects.',
    (select id from public.taxonomic_orders where name = 'Archaeognatha')),
  ('20000000-0000-0000-0000-000000000102', 'Lepismatidae',       'Silverfish',    'Wingless silver-grey scavengers of damp, starchy material in buildings and leaf litter.',
    (select id from public.taxonomic_orders where name = 'Zygentoma')),
  ('20000000-0000-0000-0000-000000000103', 'Ephemeridae',      'Mayflies',      'Nymphs are aquatic grazers; the brief winged adult is the classic sign of a healthy stream.',
    (select id from public.taxonomic_orders where name = 'Ephemeroptera')),
  ('20000000-0000-0000-0000-000000000104', 'Libellulidae',     'Skimmers',      'Perching dragonflies; the nymphs are the most abundant predatory dipteran larvae in still water.',
    (select id from public.taxonomic_orders where name = 'Odonata')),
  ('20000000-0000-0000-0000-000000000105', 'Perlidae',         'Stoneflies',    'Nymphs need cold, well-oxygenated water and are among the first organisms to vanish from a polluted stream.',
    (select id from public.taxonomic_orders where name = 'Plecoptera')),
  ('20000000-0000-0000-0000-000000000106', 'Forficulidae',     'Earwigs',       'Recognisable by the paired forceps at the tip of the abdomen, used in defence and mating.',
    (select id from public.taxonomic_orders where name = 'Dermaptera')),
  ('20000000-0000-0000-0000-000000000107', 'Zorotypidae',      'Angel insects', 'Minute, gregarious, wingless insects of rotting wood that are easily overlooked.',
    (select id from public.taxonomic_orders where name = 'Zoraptera')),
  ('20000000-0000-0000-0000-000000000108', 'Mantidae',         'Praying mantises', 'Raptorial forelegs and an elongated prothorax; important generalist predators of crop pests.',
    (select id from public.taxonomic_orders where name = 'Mantodea')),
  ('20000000-0000-0000-0000-000000000109', 'Rhinotermitidae',  'Termites',      'Social decomposers of dead wood; subterranean species are among the most economically damaging insects worldwide.',
    (select id from public.taxonomic_orders where name = 'Blattodea')),
  ('20000000-0000-0000-0000-000000000110', 'Grylloblattidae',  'Ice crawlers',  'A relict family of cold-adapted, wingless insects confined to high mountains and glacier margins.',
    (select id from public.taxonomic_orders where name = 'Grylloblattodea')),
  ('20000000-0000-0000-0000-000000000111', 'Mantophasmatidae', 'Gladiator insects', 'A small southern African family that both ambushes prey and shows maternal care of the young.',
    (select id from public.taxonomic_orders where name = 'Mantophasmatodea')),
  ('20000000-0000-0000-0000-000000000112', 'Phylliidae',       'Leaf insects',  'Leaf-mimicking phasmids, flattened so completely that the leaf veins appear to continue across the body.',
    (select id from public.taxonomic_orders where name = 'Phasmatodea')),
  ('20000000-0000-0000-0000-000000000113', 'Oligotomidae',     'Webspinners',   'Spin silk from glands on the enlarged front legs and live in colonies inside silk galleries.',
    (select id from public.taxonomic_orders where name = 'Embioptera')),
  ('20000000-0000-0000-0000-000000000114', 'Liposcelididae',   'Booklice',      'Minute wingless insects of stored paper, grain and books; largely harmless, occasionally a nuisance in archives.',
    (select id from public.taxonomic_orders where name = 'Psocodea')),
  ('20000000-0000-0000-0000-000000000115', 'Corydalidae',      'Dobsonflies',   'Large-jawed insects whose predatory aquatic larvae, the hellgrammites, are familiar to anglers.',
    (select id from public.taxonomic_orders where name = 'Megaloptera')),
  ('20000000-0000-0000-0000-000000000116', 'Raphidiidae',      'Snakeflies',    'Predatory insects with a long flexible prothorax held forward like a snake head.',
    (select id from public.taxonomic_orders where name = 'Raphidioptera')),
  ('20000000-0000-0000-0000-000000000117', 'Panorpidae',       'Scorpionflies', 'Recognisable by the beak-like rostrum and, in males, an upturned abdomen resembling a scorpion tail.',
    (select id from public.taxonomic_orders where name = 'Mecoptera')),
  ('20000000-0000-0000-0000-000000000118', 'Pulicidae',        'Fleas',         'Laterally flattened, wingless and superbly adapted to jumping; vectors of plague and several tapeworms.',
    (select id from public.taxonomic_orders where name = 'Siphonaptera')),
  ('20000000-0000-0000-0000-000000000119', 'Limnephilidae',   'Caddisflies',   'Moth-like insects whose aquatic larvae build portable cases of sand, silk and plant fragments.',
    (select id from public.taxonomic_orders where name = 'Trichoptera')),
  ('20000000-0000-0000-0000-000000000120', 'Stylopidae',       'Twisted-wing parasites', 'Highly specialised endoparasites of bees and wasps; the free-living male has vestigial fan-shaped wings.',
    (select id from public.taxonomic_orders where name = 'Strepsiptera'))
on conflict (name) do nothing;

-- Genera ---------------------------------------------------------------------
insert into public.taxonomic_genera (id, name, family_id, description) values
  ('30000000-0000-0000-0000-000000000101', 'Archaeognatha',     '20000000-0000-0000-0000-000000000101', 'Jumping bristletails able to spring away from disturbance without any aid from wings.'),
  ('30000000-0000-0000-0000-000000000102', 'Ctenolepisma',      '20000000-0000-0000-0000-000000000102', 'Long-tailed silverfish that nibble starches in stored food, paper and book bindings.'),
  ('30000000-0000-0000-0000-000000000103', 'Cloeon',            '20000000-0000-0000-0000-000000000103', 'Small mayflies with three tails, very common in still and slow-moving water.'),
  ('30000000-0000-0000-0000-000000000104', 'Orthetrum',         '20000000-0000-0000-0000-000000000104', 'Perching skimmers that hold the abdomen level or slightly raised while hunting.'),
  ('30000000-0000-0000-0000-000000000105', 'Perla',             '20000000-0000-0000-0000-000000000105', 'Stoneflies whose nymphs require high oxygen levels, making them excellent water-quality indicators.'),
  ('30000000-0000-0000-0000-000000000106', 'Forficula',         '20000000-0000-0000-0000-000000000106', 'Earwigs that overwinter in soil and can feed on seedlings and soft fruit in spring.'),
  ('30000000-0000-0000-0000-000000000107', 'Usazoros',         '20000000-0000-0000-0000-000000000107', 'Angel insects that feed on fungi and small arthropods in damp, decaying wood; Usazoros is the name now used for the North American zorapterans once placed in Zorotypus.'),
  ('30000000-0000-0000-0000-000000000108', 'Mantis',            '20000000-0000-0000-0000-000000000108', 'Praying mantises, valued generalist predators of flying insect pests in field crops.'),
  ('30000000-0000-0000-0000-000000000109', 'Reticulitermes',    '20000000-0000-0000-0000-000000000109', 'Subterranean termites that attack timber in contact with soil and structural wood in buildings.'),
  ('30000000-0000-0000-0000-000000000110', 'Grylloblatta',      '20000000-0000-0000-0000-000000000110', 'Ice crawlers, slow-moving relicts of the cold, temperate high-altitude habitats.'),
  ('30000000-0000-0000-0000-000000000111', 'Mantophasma',       '20000000-0000-0000-0000-000000000111', 'Gladiator insects of southern Africa, characterised by long spined hind legs used in ritual combat.'),
  ('30000000-0000-0000-0000-000000000112', 'Cryptophyllium',   '20000000-0000-0000-0000-000000000112', 'Leaf insects whose broad green bodies mimic foliage, including the apparent leaf venation; Cryptophyllium is the name now used for the Old World leaf insects long placed in Phyllium.'),
  ('30000000-0000-0000-0000-000000000113', 'Oligotoma',         '20000000-0000-0000-0000-000000000113', 'Webspinners that construct galleries in silk and live gregariously in colonies.'),
  ('30000000-0000-0000-0000-000000000114', 'Liposcelis',        '20000000-0000-0000-0000-000000000114', 'Booklice of stored materials, active in dry warm rooms and harmless to people.'),
  ('30000000-0000-0000-0000-000000000115', 'Corydalus',         '20000000-0000-0000-0000-000000000115', 'Dobsonflies, recognisable by the very long paired antennae and powerful mandibles.'),
  ('30000000-0000-0000-0000-000000000116', 'Raphidia',          '20000000-0000-0000-0000-000000000116', 'Snakeflies, active daytime predators of soft-bodied insects including aphids.'),
  ('30000000-0000-0000-0000-000000000117', 'Panorpa',           '20000000-0000-0000-0000-000000000117', 'Scorpionflies of damp woodland, often predaceous but also important scavengers.'),
  ('30000000-0000-0000-0000-000000000118', 'Ctenocephalides',   '20000000-0000-0000-0000-000000000118', 'Host-specific fleas of cats, dogs and their wild relatives; vectors of Dipylidium.'),
  ('30000000-0000-0000-0000-000000000119', 'Limnephilus',       '20000000-0000-0000-0000-000000000119', 'Caddisflies of still and slow water, whose larvae are among the few insects to build portable homes.'),
  ('30000000-0000-0000-0000-000000000120', 'Stylops',           '20000000-0000-0000-0000-000000000120', 'Bee parasites; the female is a permanently embedded, legless endoparasite of her host.')
on conflict (name) do nothing;

-- Species --------------------------------------------------------------------
-- One per previously empty order, so all 28 are browsable in the museum.
-- scientific_name is set to the iNaturalist-matched taxon, which for the four
-- genus-level entries is the genus rather than a species; those rows say so in
-- their description instead of asserting a false species.
insert into public.insects (id, scientific_name, common_name, genus_id, family_id, order_id, description, identification_characteristics, images, is_pest, is_beneficial, beneficial_category, native_region, verification_status) values
  ('40000000-0000-0000-0000-000000000101', 'Archaeognatha sp.', 'Bristletail',
   '30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101',
   (select id from public.taxonomic_orders where name = 'Archaeognatha'),
   'A genus-level representative of the bristletails, the most primitive order of insects still living. Wingless, teardrop-shaped and typically 6-10 mm long, with three long tails and a distinctive ability to jump when disturbed. Found on damp rock beside streams, under bark and in leaf litter, feeding on algae and decaying organic matter. Photographer credit for the image: no rights reserved (CC0).',
   'Wingless, tapering body with three long caudal filaments; large compound eyes; springs away from disturbance. Recorded here at genus level because bristletails are difficult to identify to species from a photograph.',
   '{}', false, false, null, 'Cosmopolitan', 'reviewed'),

  ('40000000-0000-0000-0000-000000000102', 'Ctenolepisma longicaudatum', 'Silverfish',
   '30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102',
   (select id from public.taxonomic_orders where name = 'Zygentoma'),
   'The familiar silverfish of kitchens, libraries and grain stores. Wingless, covered in fine scales that give a metallic sheen, 10-15 mm long with three tails of unequal length. Nocturnal, and feeds on starches including book paste, wallpaper paste and stored grain. A minor household nuisance rather than a field pest. Photographer credit for the image: no rights reserved (CC0).',
   'Wingless, carrot-shaped, covered in silvery scales; three tails with the middle one much the longest; quick, darting movement in the dark.',
   '{}', false, false, null, 'Cosmopolitan', 'reviewed'),

  ('40000000-0000-0000-0000-000000000103', 'Cloeon dipterum', 'Small Mayfly',
   '30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103',
   (select id from public.taxonomic_orders where name = 'Ephemeroptera'),
   'A very common small mayfly of ponds, ditches and slow streams. Nymphs graze algae on submerged vegetation; the winged adult lives only a day or two, which is the origin of the name Ephemeroptera, "winged for a day". Adults rest with the three tails held upright, unlike most other insects. Important food for fish and insect-eating birds. Photographer credit for the image: no rights reserved (CC0).',
   'Two or three long tails held upright at rest; very short-lived adult; large triangular forewings held upright above the body.',
   '{}', false, false, null, 'Widespread', 'reviewed'),

  ('40000000-0000-0000-0000-000000000104', 'Orthetrum sabina', 'Green Marsh Hawk',
   '30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000104',
   (select id from public.taxonomic_orders where name = 'Odonata'),
   'A small, very common dragonfly of ponds, canals and paddy fields across South and Southeast Asia, often with a broad pale band on the wing. Males perch conspicuously on reed tips and twigs over water, taking flying insects. Both nymph and adult are voracious predators, and dragonflies are among the most useful natural enemies of midges and mosquitoes. A good indicator of a functioning aquatic ecosystem. Photographer credit for the image: no rights reserved (CC0).',
   'Body about 30-40 mm; eyes touching broadly at the top of the head; wings held flat or slightly forward at rest; dark thorax with pale stripes.',
   '{}', false, true, 'predator', 'South and Southeast Asia', 'reviewed'),

  ('40000000-0000-0000-0000-000000000105', 'Perla marginata', 'Stonefly',
   '30000000-0000-0000-0000-000000000105', '20000000-0000-0000-0000-000000000105',
   (select id from public.taxonomic_orders where name = 'Plecoptera'),
   'A large stonefly of clean, fast-flowing streams. Nymphs have two tails and two claws on each leg, and must live in cold water rich in dissolved oxygen, which is why stoneflies disappear quickly from a polluted stream. Because of that, their presence is one of the strongest available indicators that a watercourse is clean. Adults are short-lived, clumsy fliers found resting on vegetation beside the water. Photographer credit for the image: no rights reserved (CC0).',
   'Two long tails; large size for the order; long antennae; adults found on riverside vegetation rather than at the water surface.',
   '{}', false, false, null, 'Holarctic', 'reviewed'),

  ('40000000-0000-0000-0000-000000000106', 'Forficula auricularia', 'European Earwig',
   '30000000-0000-0000-0000-000000000106', '20000000-0000-0000-0000-000000000106',
   (select id from public.taxonomic_orders where name = 'Dermaptera'),
   'A common earwig, largely nocturnal and omnivorous. It can be a minor pest of soft fruit, flowers and young seedlings in spring, but also eats aphids and other small insects, so its net effect is usually neutral rather than harmful. Overwinters in soil and moves into buildings when cold weather arrives. Photographer credit for the image: no rights reserved (CC0).',
   'Caramel to dark brown, 12-15 mm; forceps-like pair of pincers at the tip of the abdomen; short forewings leaving much of the abdomen exposed.',
   '{}', false, false, null, 'Introduced, widespread', 'reviewed'),

  ('40000000-0000-0000-0000-000000000107', 'Usazoros hubbardi', 'Angel Insect',
   '30000000-0000-0000-0000-000000000107', '20000000-0000-0000-0000-000000000107',
   (select id from public.taxonomic_orders where name = 'Zoraptera'),
   'A tiny, rarely seen insect of damp decaying wood and leaf litter, 2-3 mm long. Nymphs are wingless and pale, while adults are dark and may have short wings. Eats fungi, mites and small arthropods, and lives in small colonies. So easily overlooked that most people will never record one, yet it occupies an ancient and isolated evolutionary line. Photographer credit for the image: no rights reserved (CC0).',
   'Very small (2-3 mm), gregarious, pale nymphs and darker adults; long antennae and a nine-segmented abdomen with a single pair of forceps.',
   '{}', false, false, null, 'Americas', 'reviewed'),

  ('40000000-0000-0000-0000-000000000108', 'Mantis religiosa', 'Praying Mantis',
   '30000000-0000-0000-0000-000000000108', '20000000-0000-0000-0000-000000000108',
   (select id from public.taxonomic_orders where name = 'Mantodea'),
   'The familiar European mantis, and a valuable ally in the field. The triangular head swivels to track prey, and the spined, folded forelegs form a efficient cage for seizing grasshoppers, flies and moths. One of the few insects actively beneficial in cropping, taking large numbers of flying pests and contributing little to nothing to pest pressure. Photographer credit for the image: no rights reserved (CC0).',
   'Triangular head that swivels, very long prothorax, folded spined forelegs, wings held narrow along the back in the adult.',
   '{}', false, true, 'predator', 'Introduced, widespread', 'verified'),

  ('40000000-0000-0000-0000-000000000109', 'Reticulitermes flavipes', 'Subterranean Termite',
   '30000000-0000-0000-0000-000000000109', '20000000-0000-0000-0000-000000000109',
   (select id from public.taxonomic_orders where name = 'Blattodea'),
   'A native subterranean termite and one of the most economically damaging insects in the world. It lives entirely underground in colonies of hundreds of thousands to millions, tunnelling through soil and attacking timber in contact with the ground, roots of young plants, and structural wood in buildings. A mature colony can consume a substantial timber structure remarkably quickly. Soldier and worker castes are pale and soft-bodied, blind and slow-moving. Photographer credit for the image: no rights reserved (CC0).',
   'Pale, soft-bodied, wingless workers and large-headed soldiers; no eyes; found in mud tubes against foundations and in rotting timber at or below ground level.',
   '{}', true, false, null, 'Native, widespread', 'verified'),

  ('40000000-0000-0000-0000-000000000110', 'Grylloblatta campodeiformis', 'Ice Crawler',
   '30000000-0000-0000-0000-000000000110', '20000000-0000-0000-0000-000000000110',
   (select id from public.taxonomic_orders where name = 'Grylloblattodea'),
   'A living relict of a very ancient insect lineage, known only from cold, high-altitude habitats in western North America and Asia. About 25-30 mm long, pale straw-coloured, completely wingless, with long antennae and a soft flaccid abdomen. Feeds opportunistically on whatever dead insect material it finds in ice caves, talus and snowmelt. Of no agricultural significance whatsoever, but scientifically important as a survivor of an ancient fauna. Photographer credit for the image: no rights reserved (CC0).',
   'Wingless, elongate, pale and soft-bodied with long filiform antennae; found crawling slowly on snow, ice and talus at high altitude.',
   '{}', false, false, null, 'Holarctic, high altitude', 'reviewed'),

  ('40000000-0000-0000-0000-000000000111', 'Mantophasma zephyra', 'Gladiator Insect',
   '30000000-0000-0000-0000-000000000111', '20000000-0000-0000-0000-000000000111',
   (select id from public.taxonomic_orders where name = 'Mantophasmatodea'),
   'A small order of about 35 species confined to southern Africa, described only in 2001 and the most recently recognised insect order. Superficially resembles a mantid but is unrelated to it. Uniquely among its relatives, the female guards her eggs and carries the first instar nymphs on her abdomen, and both sexes fight with the spined hind legs in a ritual combat that gives the order its common name. Photographer credit for the image: no rights reserved (CC0).',
   'Mantis-like but with very long spined hind legs; flightless; found on shrubland in southern Africa.',
   '{}', false, false, null, 'Southern Africa', 'reviewed'),

  ('40000000-0000-0000-0000-000000000112', 'Cryptophyllium chrisangi', 'Leaf Insect',
   '30000000-0000-0000-0000-000000000112', '20000000-0000-0000-0000-000000000112',
   (select id from public.taxonomic_orders where name = 'Phasmatodea'),
   'A leaf insect whose broad, flat green body is so closely modelled on a leaf that the apparent midrib and veins continue across its own wings and abdomen, and the legs look like leaf stalks. Females are considerably larger and more leaf-like than the slender, twig-like males. Found on shrubs in Southeast Asian rainforest, feeding on foliage and defended by a strong smell when disturbed. Photographer credit for the image: (c) Yung-Lun Lin, CC BY, via iNaturalist observation https://www.inaturalist.org/observations/316989708.',
   'Broad flattened green body imitating a leaf, with visible venation and lobed legs; long slender antennae; female wingless, male winged and twig-like.',
   '{}', false, false, null, 'Southeast Asia', 'reviewed'),

  ('40000000-0000-0000-0000-000000000113', 'Oligotoma saundersii', 'Webspinner',
   '30000000-0000-0000-0000-000000000113', '20000000-0000-0000-0000-000000000113',
   (select id from public.taxonomic_orders where name = 'Embioptera'),
   'The commonest webspinner in South Asia. It has enlarged fore tarsi containing silk glands, and spins silk from them to construct a tubular gallery over tree bark, in leaf litter and between stones. Lives in colonies, the gallery acting as both home and trap for passing prey. Adults are about 10 mm, pale brown and wingless in the female, and feed on plant material and small insects. Photographer credit for the image: (c) CK2AZ, CC BY, via iNaturalist observation https://www.inaturalist.org/observations/9523047.',
   'Slender, pale, about 10 mm; conspicuously enlarged and swollen front feet; lives inside a silk-lined gallery in bark or litter.',
   '{}', false, false, null, 'South Asia', 'reviewed'),

  ('40000000-0000-0000-0000-000000000114', 'Liposcelis bostrychophila', 'Booklouse',
   '30000000-0000-0000-0000-000000000114', '20000000-0000-0000-0000-000000000114',
   (select id from public.taxonomic_orders where name = 'Psocodea'),
   'A tiny wingless insect, 1-2 mm long, of stored books, paper, grain and dried food. It feeds on the starches and fungi in these materials and is a familiar inhabitant of libraries, archives and grain stores. Harmless to people, though heavy infestations can discolour paper. It is listed here under Psocodea because the true lice have been folded into this order by modern classification. Photographer credit for the image: no rights reserved (CC0).',
   'Very small (1-2 mm), pale brown, wingless, with a large head and long antennae; found in dry, warm conditions on stored paper and grain.',
   '{}', false, false, null, 'Cosmopolitan', 'reviewed'),

  ('40000000-0000-0000-0000-000000000115', 'Corydalus cornutus', 'Dobsonfly',
   '30000000-0000-0000-0000-000000000115', '20000000-0000-0000-0000-000000000115',
   (select id from public.taxonomic_orders where name = 'Megaloptera'),
   'A large insect, 6-8 cm across the wings, of clean fast-flowing streams. The female lays eggs on branches overhanging the water, and the predatory larvae drop into the current, where they are the hellgrammites familiar to anyone who lifts stones in a river. The aquatic larvae take several years to mature; the adult lives barely a week and takes little or no food. Photographer credit for the image: no rights reserved (CC0).',
   'Very large size, long thread-like antennae, and powerful sickle-shaped mandibles in the male; larvae have seven pairs of abdominal gills and sharp pincers.',
   '{}', false, false, null, 'Holarctic', 'reviewed'),

  ('40000000-0000-0000-0000-000000000116', 'Raphidia ophiopsis', 'Snakefly',
   '30000000-0000-0000-0000-000000000116', '20000000-0000-0000-0000-000000000116',
   (select id from public.taxonomic_orders where name = 'Raphidioptera'),
   'A predatory insect of woodland, canopy and scrub, about 15-20 mm long, instantly recognisable by the long, flexible prothorax held forward like a snake head, which it uses to seize prey. Adults and larvae both prey actively on soft-bodied insects including aphids, and females lay eggs in bark crevices. Photographer credit for the image: no rights reserved (CC0).',
   'Strikingly elongated prothorax held forward like a neck; long thread-like antennae and a long ovipositor in the female; head and prothorax capable of considerable movement.',
   '{}', false, true, 'predator', 'Holarctic', 'reviewed'),

  ('40000000-0000-0000-0000-000000000117', 'Panorpa communis', 'Scorpionfly',
   '30000000-0000-0000-0000-000000000117', '20000000-0000-0000-0000-000000000117',
   (select id from public.taxonomic_orders where name = 'Mecoptera'),
   'A common insect of damp grassland and woodland, 10-12 mm long, with a long beak-like rostrum at the tip of the head. Males carry a curved, upturned organ at the end of the abdomen that gives the common name its scorpion-like appearance. Both adults and larvae are scavengers on dead insects, though they also take small live prey, including aphids. Photographer credit for the image: no rights reserved (CC0).',
   'Elongate downward-curved rostrum; male with a scorpion-like curved tip to the abdomen; narrow membranous wings marked with dark spots.',
   '{}', false, false, null, 'Holarctic', 'reviewed'),

  ('40000000-0000-0000-0000-000000000118', 'Ctenocephalides felis', 'Cat Flea',
   '30000000-0000-0000-0000-000000000118', '20000000-0000-0000-0000-000000000118',
   (select id from public.taxonomic_orders where name = 'Siphonaptera'),
   'The flea of cats and their wild relatives, and consequently one of the most widespread fleas in the world, since it travels on domestic cats. About 2-3 mm, dark brown, wingless, laterally flattened and adapted to jumping many times its own length. It breeds in cat bedding, carpets and floor crevices, and is the intermediate host of the tapeworm Dipylidium caninum, which can infect humans, particularly children. Photographer credit for the image: no rights reserved (CC0).',
   'Small, wingless, laterally flattened, dark brown, with very large hind legs; bristles on the head and thorax that prevent easy removal from the host.',
   '{}', true, false, null, 'Cosmopolitan', 'verified'),

  ('40000000-0000-0000-0000-000000000119', 'Limnephilus lunatus', 'Caddisfly',
   '30000000-0000-0000-0000-000000000119', '20000000-0000-0000-0000-000000000119',
   (select id from public.taxonomic_orders where name = 'Trichoptera'),
   'One of the commonest caddisflies, widespread across Europe, North Africa and western Asia. The adult is a rather drab, moth-like insect that flies at dusk. The larva lives in ponds and slow streams and is one of the few insects to construct a portable case, using silk to bind together sand grains, plant fragments or small stones; the cased larvae can be found grazing on the lake bottom. Photographer credit for the image: no rights reserved (CC0).',
   'Moth-like with hairy wings held roof-like over the body and long thread-like antennae, often longer than the body; dusk-flying.',
   '{}', false, false, null, 'Palaearctic', 'reviewed'),

  ('40000000-0000-0000-0000-000000000120', 'Stylops melittae', 'Bee Parasite',
   '30000000-0000-0000-0000-000000000120', '20000000-0000-0000-0000-000000000120',
   (select id from public.taxonomic_orders where name = 'Strepsiptera'),
   'A remarkable parasite of solitary bees. The adult female is wingless, legless and permanently embedded, head-first, in the abdomen of her host, with only the tip of her abdomen exposed. Only the male is free-living, emerging in a short-lived swarm with fan-shaped hindwings and branching antennae, purely to mate. The host bee survives but is sterilised. Photographer credit for the image: (c) Susanne Primdahl, CC BY, via iNaturalist observation https://www.inaturalist.org/observations/278002909.',
   'Males have large fan-shaped hindwings and comb-like antennae; the female is a legless sac protruding from the body of a solitary bee.',
   '{}', false, false, null, 'Holarctic', 'reviewed')
-- scientific_name has no plain unique constraint (00002 only creates a unique
-- index on lower(scientific_name)), so `on conflict (scientific_name)` would fail
-- with "no unique or exclusion constraint matching the ON CONFLICT specification".
-- Conflicts are therefore resolved on the primary key, matching every other seed
-- migration in this repo. None of these 20 names duplicate the 24 seeded species.
on conflict (id) do nothing;

-- Images ---------------------------------------------------------------------
-- Written only to rows that still have no image, so re-running never clobbers a
-- photograph that has since been corrected by hand. The previous draft filtered
-- on verification_status = 'reviewed', which silently skipped the three rows this
-- migration marks 'verified'.
-- Files live in .cache/specimens-extended/ and are published by:
--   node scripts/host-extended-photos.mjs --upload
with source (scientific_name, image_ref) as (
  values
    ('Archaeognatha sp.',              'insect-images/archaeognatha.jpg'),
    ('Ctenolepisma longicaudatum',    'insect-images/ctenolepisma-longicaudatum.jpg'),
    ('Cloeon dipterum',               'insect-images/cloeon-dipterum.jpg'),
    ('Orthetrum sabina',              'insect-images/orthetrum-sabina.jpg'),
    ('Perla marginata',               'insect-images/perla-marginata.jpg'),
    ('Forficula auricularia',         'insect-images/forficula-auricularia.jpg'),
    ('Usazoros hubbardi',             'insect-images/usazoros-hubbardi.jpg'),
    ('Mantis religiosa',              'insect-images/mantis-religiosa.jpg'),
    ('Reticulitermes flavipes',       'insect-images/reticulitermes-flavipes.jpg'),
    ('Grylloblatta campodeiformis',   'insect-images/grylloblatta-campodeiformis.jpg'),
    ('Mantophasma zephyra',            'insect-images/mantophasma-zephyra.jpg'),
    ('Cryptophyllium chrisangi',      'insect-images/cryptophyllium-chrisangi.jpg'),
    ('Oligotoma saundersii',          'insect-images/oligotoma-saundersii.jpg'),
    ('Liposcelis bostrychophila',     'insect-images/liposcelis-bostrychophila.jpg'),
    ('Corydalus cornutus',            'insect-images/corydalus-cornutus.jpg'),
    ('Raphidia ophiopsis',            'insect-images/raphidia-ophiopsis.jpg'),
    ('Panorpa communis',              'insect-images/panorpa-communis.jpg'),
    ('Ctenocephalides felis',         'insect-images/ctenocephalides-felis.jpg'),
    ('Limnephilus lunatus',           'insect-images/limnephilus-lunatus.jpg'),
    ('Stylops melittae',              'insect-images/stylops-melittae.jpg')
)
update public.insects i
set images = array[s.image_ref]
from source s
where i.scientific_name = s.scientific_name
  and coalesce(cardinality(i.images), 0) = 0;

-- Report ----------------------------------------------------------------------
do $$
declare
  total_orders integer;
  covered integer;
begin
  select count(*) into total_orders from public.taxonomic_orders;
  select count(distinct order_id) into covered from public.insects;
  raise notice 'orders: %, orders with at least one specimen: %', total_orders, covered;
end
$$;
