-- EntomoLens: seed — taxonomy, crops, symptoms, methods, references.
-- Content is a conservative, curated starter set of well-documented organisms.
-- UUIDs are deterministic so relational seeds can reference them.
-- Idempotent: re-running never duplicates.

-- ---------------------------------------------------------------------------
-- Taxonomic orders
-- ---------------------------------------------------------------------------
insert into public.taxonomic_orders (id, name, common_name, description) values
  ('10000000-0000-0000-0000-000000000001', 'Hemiptera', 'True bugs', 'Sucking insects including whiteflies, aphids, mealybugs, leafhoppers and stainer bugs.'),
  ('10000000-0000-0000-0000-000000000002', 'Lepidoptera', 'Butterflies and moths', 'Scaling-winged insects whose larvae (caterpillars) feed on foliage, stems and fruit.'),
  ('10000000-0000-0000-0000-000000000003', 'Coleoptera', 'Beetles', 'Hard-shelled insects with chewing mouthparts in both adult and larval stages.'),
  ('10000000-0000-0000-0000-000000000004', 'Thysanoptera', 'Thrips', 'Minute slender insects with rasping-sucking mouthparts.'),
  ('10000000-0000-0000-0000-000000000005', 'Diptera', 'True flies', 'Two-winged insects; includes fruit flies, hoverflies and tachinid flies.'),
  ('10000000-0000-0000-0000-000000000006', 'Orthoptera', 'Grasshoppers and crickets', 'Leaping insects with chewing mouthparts; some form migratory swarms.'),
  ('10000000-0000-0000-0000-000000000007', 'Hymenoptera', 'Bees, wasps and ants', 'Winged or wingless insects including bees and parasitoid wasps.'),
  ('10000000-0000-0000-0000-000000000008', 'Neuroptera', 'Lacewings', 'Soft-bodied predatory insects with delicate net-veined wings.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Taxonomic families
-- ---------------------------------------------------------------------------
insert into public.taxonomic_families (id, name, common_name, description, order_id) values
  ('20000000-0000-0000-0000-000000000001', 'Aleyrodidae', 'Whiteflies', 'Small sap-feeding flies with white powdery wings.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Aphididae', 'Aphids', 'Soft-bodied sap-feeding insects, often with cornicles.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Pseudococcidae', 'Mealybugs', 'Sap-feeding insects covered with waxy mealy secretions.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'Pyrrhocoridae', 'Stainer bugs', 'Brightly coloured true bugs that stain cotton fibre.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'Cicadellidae', 'Leafhoppers', 'Jumping sap-feeding bugs on a wide range of crops.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000006', 'Noctuidae', 'Owlet moths', 'Dull-coloured moths with robust caterpillars, many are serious crop pests.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000007', 'Gelechiidae', 'Gelechiid moths', 'Small moths; includes serious pests of cotton and stored grain.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000008', 'Crambidae', 'Crambid moths', 'Grass and stem moths; includes the brinjal shoot and fruit borer.', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000009', 'Curculionidae', 'Weevils', 'Snout beetles; major pests of cotton and stored products.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000010', 'Coccinellidae', 'Ladybird beetles', 'Distinctively spotted beetles; adults and larvae are important predators.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000011', 'Chrysomelidae', 'Leaf beetles', 'Diverse family including stored-pulse bruchid beetles.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000012', 'Dermestidae', 'Skin and grain beetles', 'Scavenging beetles; includes the destructive khapra beetle.', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000013', 'Thripidae', 'Common thrips', 'Slender thrips that rasp plant tissues.', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000014', 'Tephritidae', 'Fruit flies', 'Picturesque-winged flies whose larvae feed inside fruit.', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000015', 'Syrphidae', 'Hoverflies', 'Fly pollinators and predators; aphid-feeding larvae.', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000016', 'Acrididae', 'Grasshoppers and locusts', 'Large chewing insects; some form plague swarms.', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000017', 'Trichogrammatidae', 'Trichogramma wasps', 'Tiny egg parasitoids of many moth pests.', '10000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000018', 'Apidae', 'True bees', 'Includes the western honey bee, a major pollinator.', '10000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000019', 'Anthocoridae', 'Minute pirate bugs', 'Small predatory bugs of thrips, mites and eggs.', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000021', 'Chrysopidae', 'Green lacewings', 'Delicate green-winged insects; voracious aphid and egg predators.', '10000000-0000-0000-0000-000000000008'),
  ('20000000-0000-0000-0000-000000000022', 'Delphacidae', 'Planthoppers', 'Sap-feeding planthoppers; includes the brown planthopper of rice.', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Taxonomic genera
-- ---------------------------------------------------------------------------
insert into public.taxonomic_genera (id, name, description, family_id) values
  ('30000000-0000-0000-0000-000000000001', 'Bemisia', 'Whiteflies; B. tabaci is a global crop pest.', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Aphis', 'Large aphid genus; A. gossypii is the cotton aphid.', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003', 'Phenacoccus', 'Mealybugs; P. solenopsis is the cotton mealybug.', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', 'Dysdercus', 'Stainer bugs; D. koenigii stains cotton.', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000005', 'Amrasca', 'Leafhoppers; A. biguttula is the cotton jassid.', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000006', 'Helicoverpa', 'Highly polyphagous bollworm moths.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000007', 'Spodoptera', 'Armyworms and cutworms; serious foliage pests.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000008', 'Agrotis', 'Cutworm moths whose larvae cut seedlings.', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000009', 'Pectinophora', 'Pink bollworm of cotton.', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000010', 'Leucinodes', 'Stem and fruit borers of solanaceous crops.', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000011', 'Anthonomus', 'Flower and boll weevils.', '20000000-0000-0000-0000-000000000009'),
  ('30000000-0000-0000-0000-000000000012', 'Coccinella', 'Classic spotted ladybird beetles.', '20000000-0000-0000-0000-000000000010'),
  ('30000000-0000-0000-0000-000000000013', 'Callosobruchus', 'Bruchid weevils of stored pulses and grain.', '20000000-0000-0000-0000-000000000011'),
  ('30000000-0000-0000-0000-000000000014', 'Trogoderma', 'Dermestid beetles of stored grain; includes khapra beetle.', '20000000-0000-0000-0000-000000000012'),
  ('30000000-0000-0000-0000-000000000015', 'Thrips', 'Type genus of thripid thrips.', '20000000-0000-0000-0000-000000000013'),
  ('30000000-0000-0000-0000-000000000016', 'Bactrocera', 'Major fruit fly pests of horticulture.', '20000000-0000-0000-0000-000000000014'),
  ('30000000-0000-0000-0000-000000000017', 'Episyrphus', 'Aphid-feeding hoverflies.', '20000000-0000-0000-0000-000000000015'),
  ('30000000-0000-0000-0000-000000000018', 'Locusta', 'Migratory locusts.', '20000000-0000-0000-0000-000000000016'),
  ('30000000-0000-0000-0000-000000000019', 'Trichogramma', 'Egg parasitoids released for biological control.', '20000000-0000-0000-0000-000000000017'),
  ('30000000-0000-0000-0000-000000000020', 'Apis', 'Cavity-nesting honey bees.', '20000000-0000-0000-0000-000000000018'),
  ('30000000-0000-0000-0000-000000000021', 'Orius', 'Minute pirate bugs, key thrips predators.', '20000000-0000-0000-0000-000000000019'),
  ('30000000-0000-0000-0000-000000000022', 'Nilaparvata', 'Plant hopper; brown planthopper of rice.', '20000000-0000-0000-0000-000000000022'),
  ('30000000-0000-0000-0000-000000000023', 'Chrysoperla', 'Common green lacewings used in augmentative biocontrol.', '20000000-0000-0000-0000-000000000021')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Crops
-- ---------------------------------------------------------------------------
insert into public.crops (id, name, scientific_name, description, region) values
  ('50000000-0000-0000-0000-000000000001', 'Cotton', 'Gossypium hirsutum', 'Fibre crop susceptible to a broad pest complex from seedling to boll stage.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000002', 'Wheat', 'Triticum aestivum', 'Staple cereal; occasional stalk-cutting cutworm and locust damage.', 'Temperate and subtropical'),
  ('50000000-0000-0000-0000-000000000003', 'Maize', 'Zea mays', 'Cereal attacked especially by fall armyworm and stem-feeding bollworms.', 'Tropical to temperate'),
  ('50000000-0000-0000-0000-000000000004', 'Rice', 'Oryza sativa', 'Landmark cereal; sap-feeding planthoppers and invasive armyworms are key concerns.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000005', 'Tomato', 'Solanum lycopersicum', 'Vegetable crop; whitefly and fruit borer are the major pest groups.', 'Warm climates'),
  ('50000000-0000-0000-0000-000000000006', 'Okra', 'Abelmoschus esculentus', 'Vegetable attacked by jassids, whitefly and fruit borers.', 'Tropical'),
  ('50000000-0000-0000-0000-000000000007', 'Chickpea', 'Cicer arietinum', 'Pulse crop; pod borer is the key field pest, bruchids the main storage pest.', 'Semi-arid'),
  ('50000000-0000-0000-0000-000000000008', 'Sugarcane', 'Saccharum officinarum', 'Cane crop; young stands vulnerable to cutworms and armyworms.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000009', 'Potato', 'Solanum tuberosum', 'Tuber crop; cutworms attack young stems; whitefly may appear in warm regions.', 'Cool to subtropical'),
  ('50000000-0000-0000-0000-000000000010', 'Brinjal', 'Solanum melongena', 'Eggplant; shoot and fruit borer is the classic damaging pest.', 'Tropical and subtropical'),
  ('50000000-0000-0000-0000-000000000011', 'Chilli', 'Capsicum annuum', 'Spice crop; thrips and whitefly cause leaf damage and virus spread.', 'Tropical'),
  ('50000000-0000-0000-0000-000000000012', 'Cucumber', 'Cucumis sativus', 'Cucurbit vegetable; maturing fruit is the main target of fruit flies.', 'Tropical and warm temperate')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Damage symptoms
-- ---------------------------------------------------------------------------
insert into public.damage_symptoms (id, name, category, description) values
  ('60000000-0000-0000-0000-000000000001', 'Chewed leaves and holes', 'chewing', 'Irregular holes and notching on leaf margins from chewing insects.'),
  ('60000000-0000-0000-0000-000000000002', 'Leaf stippling and yellowing', 'piercing-sucking', 'Fine pale stipples, chlorosis and leaf yellowing from sap-feeding insects.'),
  ('60000000-0000-0000-0000-000000000003', 'Honeydew and sooty mould', 'other', 'Sticky excreta supporting black sooty mould that blocks leaf light.'),
  ('60000000-0000-0000-0000-000000000004', 'Leaf mining', 'mining', 'Serpentine whitish tunnels inside leaf tissues from mining larvae.'),
  ('60000000-0000-0000-0000-000000000005', 'Fruit boring and exit holes', 'fruit-damage', 'Entry and exit holes on fruit with internal tunnels and frass.'),
  ('60000000-0000-0000-0000-000000000006', 'Skeletonized leaves', 'skeletonization', 'Leaf tissue removed leaving only veins, giving a lace-like appearance.'),
  ('60000000-0000-0000-0000-000000000007', 'Webbing on foliage', 'webbing', 'Silken webbing rolled or binding leaves and growing points.'),
  ('60000000-0000-0000-0000-000000000008', 'Leaf curling', 'curling', 'Curled, distorted and crinkled young leaves.'),
  ('60000000-0000-0000-0000-000000000009', 'Wilting and stunting', 'wilting', 'Wilted, stunted or dying plants from root, stem or vascular feeding.'),
  ('60000000-0000-0000-0000-000000000010', 'Stored-grain damage', 'other', 'Grain hollowed, contaminated or infested in storage.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Management methods (IPM)
-- ---------------------------------------------------------------------------
insert into public.management_methods (id, name, category, description) values
  ('70000000-0000-0000-0000-000000000001', 'Regular field scouting', 'monitoring', 'Monitor crops weekly; use sticky traps and inspect leaf undersides for early stages.'),
  ('70000000-0000-0000-0000-000000000002', 'Crop rotation and resistant varieties', 'cultural', 'Rotate crops and choose tolerant/resistant cultivars to reduce pest build-up.'),
  ('70000000-0000-0000-0000-000000000003', 'Hand picking and removal', 'mechanical', 'Remove and destroy egg masses and heavily infested plant parts.'),
  ('70000000-0000-0000-0000-000000000004', 'Yellow sticky traps and netting', 'physical', 'Deploy sticky traps for winged stages and exclusion netting where practical.'),
  ('70000000-0000-0000-0000-000000000005', 'Biological control', 'biological', 'Conserve natural enemies and release biocontrol agents (e.g. Trichogramma, lacewings).'),
  ('70000000-0000-0000-0000-000000000006', 'Judicious chemical control', 'chemical', 'Apply only approved insecticides at label rates, scouting-based thresholds and targeted timing.'),
  ('70000000-0000-0000-0000-000000000007', 'Sanitation and hygiene in storage', 'cultural', 'Clean storage premises, inspect incoming lots, and use of fumigation only by trained operators.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Scientific references (real, verifiable sources)
-- ---------------------------------------------------------------------------
insert into public.scientific_references (id, title, authors, year, journal, doi, url, source_type) values
  ('80000000-0000-0000-0000-000000000001', 'IPM for Bemisia tabaci: a case study from North America', ARRAY['Ellsworth, P. C.', 'Martinez-Carrillo, J. L.'], 2001, 'Crop Protection', '10.1016/S0261-2194(01)00114-0', null, 'journal'),
  ('80000000-0000-0000-0000-000000000002', 'The ecology of Heliothis armigera (Hübner) and H. punctigera (Wallengren) in Australia', ARRAY['Fitt, G. P.'], 1989, 'Annual Review of Entomology', '10.1146/annurev.en.34.010189.002105', null, 'journal'),
  ('80000000-0000-0000-0000-000000000003', 'Insect Pests of Rice', ARRAY['Pathak, M. D.', 'Khan, Z. R.'], 1994, null, null, null, 'book'),
  ('80000000-0000-0000-0000-000000000004', 'CABI Compendium — Bemisia tabaci', ARRAY['CABI' ], 2024, null, null, 'https://www.cabidigitallibrary.org/doi/10.1079/cabicompendium.8927', 'database'),
  ('80000000-0000-0000-0000-000000000005', 'Diseases, Pests and Weeds in Tropical Crops', ARRAY['Kranz, J.', 'Schmutterer, H.', 'Koch, W.'], 1977, null, null, null, 'book')
on conflict (id) do nothing;