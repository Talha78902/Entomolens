-- 00009_seed_quizzes.sql
-- Curated quizzes across all six categories and three difficulty levels.
-- Deterministic UUIDs: quizzes a0000000-…, questions b0000000-…, options c0000000-…

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
insert into public.quizzes (id, title, category, difficulty, description) values
  ('a0000000-0000-4000-8000-000000000001', 'Taxonomy Basics',                  'taxonomy',            'beginner',     'Ranking, naming and the ordering of insect life.'),
  ('a0000000-0000-4000-8000-000000000002', 'Advanced Taxonomy',                'taxonomy',            'advanced',     'Families and finer classification of common agroecosystem insects.'),
  ('a0000000-0000-4000-8000-000000000003', 'Pest Identification',              'pest-identification', 'beginner',     'Recognise the most common field pests.'),
  ('a0000000-0000-4000-8000-000000000004', 'Common Field Pests',               'pest-identification', 'intermediate', 'Identification of pests from their damage symptoms.'),
  ('a0000000-0000-4000-8000-000000000005', 'Beneficial Insects',               'beneficial-insects',  'beginner',     'The insects that work for you.'),
  ('a0000000-0000-4000-8000-000000000006', 'Beneficial Professionals',         'beneficial-insects',  'intermediate', 'Predators, parasitoids and bio-control agents.'),
  ('a0000000-0000-4000-8000-000000000007', 'Life Cycles',                      'life-cycles',         'beginner',     'How insects grow and develop.'),
  ('a0000000-0000-4000-8000-000000000008', 'Advanced Life Cycles',             'life-cycles',         'advanced',     'Diapause, polymorphism and hidden development.'),
  ('a0000000-0000-4000-8000-000000000009', 'Crop Pests',                       'crop-pests',          'beginner',     'Major pests of cotton, rice, sugarcane and vegetables.'),
  ('a0000000-0000-4000-8000-00000000000a', 'IPM Fundamentals',                 'ipm',                 'beginner',     'Core ideas behind Integrated Pest Management.'),
  ('a0000000-0000-4000-8000-00000000000b', 'IPM Strategy',                     'ipm',                 'intermediate', 'Thresholds, scouting and bio-control decisions.'),
  ('a0000000-0000-4000-8000-00000000000c', 'Cotton IPM Challenge',             'crop-pests',          'advanced',     'A field-season scenario quiz for the cotton crop.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Questions + options (correct option first in each block)
-- ---------------------------------------------------------------------------

-- Quiz 1: Taxonomy Basics (q01–q04)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Which is the highest (broadest) taxonomic rank?',
   'Ranking from broadest to narrowest: Kingdom → Phylum → Class → Order → Family → Genus → Species.', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'A scientific name such as Helicoverpa armigera is written…',
   'Binomial names are italicised with the genus capitalised and the species in lower case.', 2),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'To which order does the honeybee belong?',
   'Bees, wasps and ants belong to Hymenoptera, defined by two pairs of membranous wings.', 3),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'The science of naming and classifying organisms is called…',
   'Taxonomy is the discipline of identifying, naming and classifying organisms.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Order', true, 1),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Family', false, 2),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Genus', false, 3),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Species', false, 4),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'With an italic genus and lower-case species', true, 1),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'With capitals for both words', false, 2),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'In quotation marks', false, 3),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002', 'Underlined only', false, 4),
  ('c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000003', 'Hymenoptera', true, 1),
  ('c0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-000000000003', 'Diptera', false, 2),
  ('c0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-000000000003', 'Lepidoptera', false, 3),
  ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-000000000003', 'Coleoptera', false, 4),
  ('c0000000-0000-4000-8000-00000000000d', 'b0000000-0000-4000-8000-000000000004', 'Taxonomy', true, 1),
  ('c0000000-0000-4000-8000-00000000000e', 'b0000000-0000-4000-8000-000000000004', 'Ecology', false, 2),
  ('c0000000-0000-4000-8000-00000000000f', 'b0000000-0000-4000-8000-000000000004', 'Entomology', false, 3),
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000004', 'Embryology', false, 4);

-- Quiz 2: Advanced Taxonomy (q05–q08)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002',
   'In binomial nomenclature the first word of the name denotes the…',
   'The first word is the genus (e.g. Coccinella in Coccinella septempunctata).', 1),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002',
   'Ladybird beetles belong to which family?',
   'Coccinellidae — the ladybird or lady beetle family.', 2),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002',
   'The predatory green lacewing belongs to which order?',
   'Green lacewings are Neuroptera — lacewings, owlflies and antlions.', 3),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002',
   'Whiteflies belong to which hemipteran family?',
   'Whiteflies are Aleyrodidae, tiny sap-feeding true bugs.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000005', 'Genus', true, 1),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000005', 'Species', false, 2),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000005', 'Family', false, 3),
  ('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000005', 'Order', false, 4),
  ('c0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000006', 'Coccinellidae', true, 1),
  ('c0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000006', 'Chrysopidae', false, 2),
  ('c0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000006', 'Syrphidae', false, 3),
  ('c0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000006', 'Trichogrammatidae', false, 4),
  ('c0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000007', 'Neuroptera', true, 1),
  ('c0000000-0000-4000-8000-00000000001a', 'b0000000-0000-4000-8000-000000000007', 'Odonata', false, 2),
  ('c0000000-0000-4000-8000-00000000001b', 'b0000000-0000-4000-8000-000000000007', 'Mantodea', false, 3),
  ('c0000000-0000-4000-8000-00000000001c', 'b0000000-0000-4000-8000-000000000007', 'Isoptera', false, 4),
  ('c0000000-0000-4000-8000-00000000001d', 'b0000000-0000-4000-8000-000000000008', 'Aleyrodidae', true, 1),
  ('c0000000-0000-4000-8000-00000000001e', 'b0000000-0000-4000-8000-000000000008', 'Aphididae', false, 2),
  ('c0000000-0000-4000-8000-00000000001f', 'b0000000-0000-4000-8000-000000000008', 'Cicadellidae', false, 3),
  ('c0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000008', 'Thripidae', false, 4);

-- Quiz 3: Pest Identification (q09–q12)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003',
   'A small soft-bodied insect clustering on new shoots and producing sticky honeydew is most likely…',
   'Aphids are soft-bodied, gregarious sap-feeders that excrete honeydew, which attracts ants.', 1),
  ('b0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003',
   'The pest that bores into cotton bolls and leaves “rosette” damage is the…',
   'Pink bollworm (Pectinophora gossypiella) feeds inside bolls causing rosetting and exit holes.', 2),
  ('b0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000003',
   'Fall armyworm belongs to which insect order?',
   'Moths and butterflies, including fall armyworm Spodoptera frugiperda, are Lepidoptera.', 3),
  ('b0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-000000000003',
   'Tiny slender insects that rasp leaf tissue causing silvery streaks are…',
   'Thrips rasp the leaf surface and feed on exuding sap, leaving silvery scars.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000009', 'Aphid', true, 1),
  ('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000009', 'Whitefly', false, 2),
  ('c0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000009', 'Thrips', false, 3),
  ('c0000000-0000-4000-8000-000000000024', 'b0000000-0000-4000-8000-000000000009', 'Scale insect', false, 4),
  ('c0000000-0000-4000-8000-000000000025', 'b0000000-0000-4000-8000-00000000000a', 'Pink bollworm', true, 1),
  ('c0000000-0000-4000-8000-000000000026', 'b0000000-0000-4000-8000-00000000000a', 'Jassid', false, 2),
  ('c0000000-0000-4000-8000-000000000027', 'b0000000-0000-4000-8000-00000000000a', 'Whitefly', false, 3),
  ('c0000000-0000-4000-8000-000000000028', 'b0000000-0000-4000-8000-00000000000a', 'Mealybug', false, 4),
  ('c0000000-0000-4000-8000-000000000029', 'b0000000-0000-4000-8000-00000000000b', 'Lepidoptera', true, 1),
  ('c0000000-0000-4000-8000-00000000002a', 'b0000000-0000-4000-8000-00000000000b', 'Diptera', false, 2),
  ('c0000000-0000-4000-8000-00000000002b', 'b0000000-0000-4000-8000-00000000000b', 'Coleoptera', false, 3),
  ('c0000000-0000-4000-8000-00000000002c', 'b0000000-0000-4000-8000-00000000000b', 'Hemiptera', false, 4),
  ('c0000000-0000-4000-8000-00000000002d', 'b0000000-0000-4000-8000-00000000000c', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-00000000002e', 'b0000000-0000-4000-8000-00000000000c', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000002f', 'b0000000-0000-4000-8000-00000000000c', 'Leaf miners', false, 3),
  ('c0000000-0000-4000-8000-000000000030', 'b0000000-0000-4000-8000-00000000000c', 'Mites', false, 4);

-- Quiz 4: Common Field Pests (q13–q16)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000004',
   '“Hopper burn” with yellow-browning leaf margins on cotton is caused by…',
   'Cotton jassid feeding removes sap and injects toxins, causing characteristic hopper burn.', 1),
  ('b0000000-0000-4000-8000-00000000000e', 'a0000000-0000-4000-8000-000000000004',
   'Silvery-white streaks and curled distorted leaves on onion/chili indicate…',
   'Thrips rasping produces silvery scars and leaf curl; adults and nymphs hide in folded leaves.', 2),
  ('b0000000-0000-4000-8000-00000000000f', 'a0000000-0000-4000-8000-000000000004',
   'Entry holes ringed with brown frass pellets in tomato/cotton fruit are typical of…',
   'Helicoverpa (American bollworm) larvae bore in and push out excreta-frass around the hole.', 3),
  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000004',
   'Ground termites most often attack crops at the…',
   'Termites girdle stems near the soil line and attack after transplanting or in dry spells.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-00000000000d', 'Cotton jassid', true, 1),
  ('c0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-00000000000d', 'Whitefly', false, 2),
  ('c0000000-0000-4000-8000-000000000033', 'b0000000-0000-4000-8000-00000000000d', 'Aphid', false, 3),
  ('c0000000-0000-4000-8000-000000000034', 'b0000000-0000-4000-8000-00000000000d', 'Spider mite', false, 4),
  ('c0000000-0000-4000-8000-000000000035', 'b0000000-0000-4000-8000-00000000000e', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-000000000036', 'b0000000-0000-4000-8000-00000000000e', 'Jassid', false, 2),
  ('c0000000-0000-4000-8000-000000000037', 'b0000000-0000-4000-8000-00000000000e', 'Whitefly', false, 3),
  ('c0000000-0000-4000-8000-000000000038', 'b0000000-0000-4000-8000-00000000000e', 'Aphid', false, 4),
  ('c0000000-0000-4000-8000-000000000039', 'b0000000-0000-4000-8000-00000000000f', 'American bollworm (Helicoverpa)', true, 1),
  ('c0000000-0000-4000-8000-00000000003a', 'b0000000-0000-4000-8000-00000000000f', 'Pink bollworm only', false, 2),
  ('c0000000-0000-4000-8000-00000000003b', 'b0000000-0000-4000-8000-00000000000f', 'Fruit fly', false, 3),
  ('c0000000-0000-4000-8000-00000000003c', 'b0000000-0000-4000-8000-00000000000f', 'Cutworm', false, 4),
  ('c0000000-0000-4000-8000-00000000003d', 'b0000000-0000-4000-8000-000000000010', 'Stem base near the soil line', true, 1),
  ('c0000000-0000-4000-8000-00000000003e', 'b0000000-0000-4000-8000-000000000010', 'Tops of mature plants', false, 2),
  ('c0000000-0000-4000-8000-00000000003f', 'b0000000-0000-4000-8000-000000000010', 'Root tip only', false, 3),
  ('c0000000-0000-4000-8000-000000000040', 'b0000000-0000-4000-8000-000000000010', 'Leaf lamina', false, 4);

-- Quiz 5: Beneficial Insects (q17–q20)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000005',
   'Ladybird beetle larvae mainly feed on…',
   'Both larval and adult ladybirds are voracious predators of aphids and scales.', 1),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000005',
   'The “aphid lion” is the larva of the…',
   'Green lacewing larvae, known as aphid lions, pierce and drain their prey.', 2),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000005',
   'Honeybees are vital in agriculture mainly because they…',
   'Pollination by bees increases fruit-set and yield for many crops.', 3),
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000005',
   'Trichogramma wasps are natural enemies that…',
   'Trichogramma are egg parasitoids — adults lay eggs inside pest eggs, killing them.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000011', 'Aphids and scale insects', true, 1),
  ('c0000000-0000-4000-8000-000000000042', 'b0000000-0000-4000-8000-000000000011', 'Pollen only', false, 2),
  ('c0000000-0000-4000-8000-000000000043', 'b0000000-0000-4000-8000-000000000011', 'Plant leaves', false, 3),
  ('c0000000-0000-4000-8000-000000000044', 'b0000000-0000-4000-8000-000000000011', 'Nectar only', false, 4),
  ('c0000000-0000-4000-8000-000000000045', 'b0000000-0000-4000-8000-000000000012', 'Green lacewing', true, 1),
  ('c0000000-0000-4000-8000-000000000046', 'b0000000-0000-4000-8000-000000000012', 'Hoverfly', false, 2),
  ('c0000000-0000-4000-8000-000000000047', 'b0000000-0000-4000-8000-000000000012', 'Ground beetle', false, 3),
  ('c0000000-0000-4000-8000-000000000048', 'b0000000-0000-4000-8000-000000000012', 'Damselfly', false, 4),
  ('c0000000-0000-4000-8000-000000000049', 'b0000000-0000-4000-8000-000000000013', 'They pollinate flowers', true, 1),
  ('c0000000-0000-4000-8000-00000000004a', 'b0000000-0000-4000-8000-000000000013', 'They eat aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000004b', 'b0000000-0000-4000-8000-000000000013', 'They aerate soil', false, 3),
  ('c0000000-0000-4000-8000-00000000004c', 'b0000000-0000-4000-8000-000000000013', 'They fix nitrogen', false, 4),
  ('c0000000-0000-4000-8000-00000000004d', 'b0000000-0000-4000-8000-000000000014', 'Kill pest eggs as egg parasitoids', true, 1),
  ('c0000000-0000-4000-8000-00000000004e', 'b0000000-0000-4000-8000-000000000014', 'Sting humans', false, 2),
  ('c0000000-0000-4000-8000-00000000004f', 'b0000000-0000-4000-8000-000000000014', 'Compete with bees for nectar', false, 3),
  ('c0000000-0000-4000-8000-000000000050', 'b0000000-0000-4000-8000-000000000014', 'Bore into wood', false, 4);

-- Quiz 6: Beneficial Professionals (q21–q24)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000006',
   'A predatory mite widely released for thrips and mite control is…',
   'Amblyseius (Neoseiulus) species are commercially used predatory mites.', 1),
  ('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000006',
   'Cryptolaemus montrouzieri (mealybug destroyer) is a specialist predator of…',
   'This ladybird beetle and its larvae attack mealybug colonies.', 2),
  ('b0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000006',
   'Which agent is used as a mycoinsecticide against sucking pests?',
   'Entomopathogenic fungi such as Beauveria bassiana infect and kill insect pests.', 3),
  ('b0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000006',
   'Encarsia formosa is a parasitoid used against…',
   'Encarsia formosa is the classic greenhouse parasitoid of whitefly nymphs.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000015', 'Amblyseius (predatory mite)', true, 1),
  ('c0000000-0000-4000-8000-000000000052', 'b0000000-0000-4000-8000-000000000015', 'Spider mite', false, 2),
  ('c0000000-0000-4000-8000-000000000053', 'b0000000-0000-4000-8000-000000000015', 'Scabies mite', false, 3),
  ('c0000000-0000-4000-8000-000000000054', 'b0000000-0000-4000-8000-000000000015', 'Varroa mite', false, 4),
  ('c0000000-0000-4000-8000-000000000055', 'b0000000-0000-4000-8000-000000000016', 'Mealybugs', true, 1),
  ('c0000000-0000-4000-8000-000000000056', 'b0000000-0000-4000-8000-000000000016', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-000000000057', 'b0000000-0000-4000-8000-000000000016', 'Grasshoppers', false, 3),
  ('c0000000-0000-4000-8000-000000000058', 'b0000000-0000-4000-8000-000000000016', 'Mole crickets', false, 4),
  ('c0000000-0000-4000-8000-000000000059', 'b0000000-0000-4000-8000-000000000017', 'Beauveria bassiana (fungus)', true, 1),
  ('c0000000-0000-4000-8000-00000000005a', 'b0000000-0000-4000-8000-000000000017', 'Baculovirus only', false, 2),
  ('c0000000-0000-4000-8000-00000000005b', 'b0000000-0000-4000-8000-000000000017', 'Entomopathogenic bacteria only', false, 3),
  ('c0000000-0000-4000-8000-00000000005c', 'b0000000-0000-4000-8000-000000000017', 'Nematode-trapping bacterium', false, 4),
  ('c0000000-0000-4000-8000-00000000005d', 'b0000000-0000-4000-8000-000000000018', 'Whiteflies', true, 1),
  ('c0000000-0000-4000-8000-00000000005e', 'b0000000-0000-4000-8000-000000000018', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000005f', 'b0000000-0000-4000-8000-000000000018', 'Caterpillars', false, 3),
  ('c0000000-0000-4000-8000-000000000060', 'b0000000-0000-4000-8000-000000000018', 'Scale insects', false, 4);

-- Quiz 7: Life Cycles (q25–q28)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000007',
   'Complete metamorphosis proceeds as…',
   'Egg → larva → pupa → adult (holometaboly), e.g. butterflies, beetles, flies.', 1),
  ('b0000000-0000-4000-8000-00000000001a', 'a0000000-0000-4000-8000-000000000007',
   'In warm seasons many aphids reproduce by…',
   'Aphids commonly reproduce by parthenogenesis, giving live birth to nymphs without mating.', 2),
  ('b0000000-0000-4000-8000-00000000001b', 'a0000000-0000-4000-8000-000000000007',
   'The pupa of many moths is formed…',
   'Most moths pupate in the soil, leaf litter or within a silk cocoon.', 3),
  ('b0000000-0000-4000-8000-00000000001c', 'a0000000-0000-4000-8000-000000000007',
   'Which insect grows through incomplete metamorphosis (egg → nymph → adult)?',
   'Grasshoppers and true bugs hatch as nymphs that resemble small adults.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000019', 'Egg → larva → pupa → adult', true, 1),
  ('c0000000-0000-4000-8000-000000000062', 'b0000000-0000-4000-8000-000000000019', 'Egg → nymph → adult', false, 2),
  ('c0000000-0000-4000-8000-000000000063', 'b0000000-0000-4000-8000-000000000019', 'Egg → pupa → larva → adult', false, 3),
  ('c0000000-0000-4000-8000-000000000064', 'b0000000-0000-4000-8000-000000000019', 'Larva → egg → adult → pupa', false, 4),
  ('c0000000-0000-4000-8000-000000000065', 'b0000000-0000-4000-8000-00000000001a', 'Parthenogenesis (live birth)', true, 1),
  ('c0000000-0000-4000-8000-000000000066', 'b0000000-0000-4000-8000-00000000001a', 'Fertilised egg-laying only', false, 2),
  ('c0000000-0000-4000-8000-000000000067', 'b0000000-0000-4000-8000-00000000001a', 'Budding', false, 3),
  ('c0000000-0000-4000-8000-000000000068', 'b0000000-0000-4000-8000-00000000001a', 'Fission', false, 4),
  ('c0000000-0000-4000-8000-000000000069', 'b0000000-0000-4000-8000-00000000001b', 'In the soil, litter or a silk cocoon', true, 1),
  ('c0000000-0000-4000-8000-00000000006a', 'b0000000-0000-4000-8000-00000000001b', 'Always in open water', false, 2),
  ('c0000000-0000-4000-8000-00000000006b', 'b0000000-0000-4000-8000-00000000001b', 'Inside other insects', false, 3),
  ('c0000000-0000-4000-8000-00000000006c', 'b0000000-0000-4000-8000-00000000001b', 'On exposed leaf upper-sides only', false, 4),
  ('c0000000-0000-4000-8000-00000000006d', 'b0000000-0000-4000-8000-00000000001c', 'Grasshopper', true, 1),
  ('c0000000-0000-4000-8000-00000000006e', 'b0000000-0000-4000-8000-00000000001c', 'Butterfly', false, 2),
  ('c0000000-0000-4000-8000-00000000006f', 'b0000000-0000-4000-8000-00000000001c', 'Beetle', false, 3),
  ('c0000000-0000-4000-8000-000000000070', 'b0000000-0000-4000-8000-00000000001c', 'Hoverfly', false, 4);

-- Quiz 8: Advanced Life Cycles (q29–q32)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000001d', 'a0000000-0000-4000-8000-000000000008',
   'Cicada nymphs typically spend their development…',
   'Cicada nymphs feed on root xylem underground for years before emerging as adults.', 1),
  ('b0000000-0000-4000-8000-00000000001e', 'a0000000-0000-4000-8000-000000000008',
   'Whitefly immature stages are characterised by…',
   'First-instar crawlers settle and become flattened, scale-like sessile nymphs.', 2),
  ('b0000000-0000-4000-8000-00000000001f', 'a0000000-0000-4000-8000-000000000008',
   'Diapause is best described as…',
   'Diapause is a genetically programmed, hormone-controlled state of arrested development.', 3),
  ('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000008',
   'Under warm favourable conditions which pest population can grow fastest?',
   'Aphids with parthenogenetic live birth can explode in days, outpacing most other pests.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000071', 'b0000000-0000-4000-8000-00000000001d', 'Underground on roots for years', true, 1),
  ('c0000000-0000-4000-8000-000000000072', 'b0000000-0000-4000-8000-00000000001d', 'In flowing water', false, 2),
  ('c0000000-0000-4000-8000-000000000073', 'b0000000-0000-4000-8000-00000000001d', 'In ant nests', false, 3),
  ('c0000000-0000-4000-8000-000000000074', 'b0000000-0000-4000-8000-00000000001d', 'Inside fruit', false, 4),
  ('c0000000-0000-4000-8000-000000000075', 'b0000000-0000-4000-8000-00000000001e', 'Sessile scale-like nymphs under leaves', true, 1),
  ('c0000000-0000-4000-8000-000000000076', 'b0000000-0000-4000-8000-00000000001e', 'Free-moving aquatic larvae', false, 2),
  ('c0000000-0000-4000-8000-000000000077', 'b0000000-0000-4000-8000-00000000001e', 'Cocooned pupae on stems', false, 3),
  ('c0000000-0000-4000-8000-000000000078', 'b0000000-0000-4000-8000-00000000001e', 'Gall-forming larvae', false, 4),
  ('c0000000-0000-4000-8000-000000000079', 'b0000000-0000-4000-8000-00000000001f', 'A programmed arrest of development to survive adverse seasons', true, 1),
  ('c0000000-0000-4000-8000-00000000007a', 'b0000000-0000-4000-8000-00000000001f', 'Accidental death in cold weather', false, 2),
  ('c0000000-0000-4000-8000-00000000007b', 'b0000000-0000-4000-8000-00000000001f', 'Rapid summer reproduction', false, 3),
  ('c0000000-0000-4000-8000-00000000007c', 'b0000000-0000-4000-8000-00000000001f', 'Migration to higher altitude', false, 4),
  ('c0000000-0000-4000-8000-00000000007d', 'b0000000-0000-4000-8000-000000000020', 'Aphid', true, 1),
  ('c0000000-0000-4000-8000-00000000007e', 'b0000000-0000-4000-8000-000000000020', 'Cicada', false, 2),
  ('c0000000-0000-4000-8000-00000000007f', 'b0000000-0000-4000-8000-000000000020', 'Termite colony', false, 3),
  ('c0000000-0000-4000-8000-000000000080', 'b0000000-0000-4000-8000-000000000020', 'Dragonfly', false, 4);

-- Quiz 9: Crop Pests (q33–q36)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000009',
   'In Pakistan the most damaging cotton bollworm complex includes…',
   'Helicoverpa armigera and pink bollworm together make up the main bollworm complex.', 1),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000009',
   'Sugarcane top borer mainly attacks the…',
   'Top borer larvae bore into the central shoot, causing deadheart.', 2),
  ('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000009',
   'Rice leaf folder feeding causes…',
   'Larvae fold leaves and scrape the green tissue, leaving white / scorched streaks.', 3),
  ('b0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000009',
   'Curled, silvery, distorted chili leaves with visible tiny insects indicate…',
   'Chili thrips produce silvering and leaf curl; insects can be shaken onto paper.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000081', 'b0000000-0000-4000-8000-000000000021', 'American bollworm + pink bollworm', true, 1),
  ('c0000000-0000-4000-8000-000000000082', 'b0000000-0000-4000-8000-000000000021', 'Fall armyworm only', false, 2),
  ('c0000000-0000-4000-8000-000000000083', 'b0000000-0000-4000-8000-000000000021', 'Boll weevil only', false, 3),
  ('c0000000-0000-4000-8000-000000000084', 'b0000000-0000-4000-8000-000000000021', 'Cutworm only', false, 4),
  ('c0000000-0000-4000-8000-000000000085', 'b0000000-0000-4000-8000-000000000022', 'Central growing shoot (deadheart)', true, 1),
  ('c0000000-0000-4000-8000-000000000086', 'b0000000-0000-4000-8000-000000000022', 'Mature cane internodes only', false, 2),
  ('c0000000-0000-4000-8000-000000000087', 'b0000000-0000-4000-8000-000000000022', 'Leaf blades', false, 3),
  ('c0000000-0000-4000-8000-000000000088', 'b0000000-0000-4000-8000-000000000022', 'Root system', false, 4),
  ('c0000000-0000-4000-8000-000000000089', 'b0000000-0000-4000-8000-000000000023', 'White or scorched streaks along the leaf', true, 1),
  ('c0000000-0000-4000-8000-00000000008a', 'b0000000-0000-4000-8000-000000000023', 'Holes in the panicle', false, 2),
  ('c0000000-0000-4000-8000-00000000008b', 'b0000000-0000-4000-8000-000000000023', 'Root galls', false, 3),
  ('c0000000-0000-4000-8000-00000000008c', 'b0000000-0000-4000-8000-000000000023', 'Sticky honeydew on panicles', false, 4),
  ('c0000000-0000-4000-8000-00000000008d', 'b0000000-0000-4000-8000-000000000024', 'Thrips', true, 1),
  ('c0000000-0000-4000-8000-00000000008e', 'b0000000-0000-4000-8000-000000000024', 'Aphids', false, 2),
  ('c0000000-0000-4000-8000-00000000008f', 'b0000000-0000-4000-8000-000000000024', 'Whiteflies', false, 3),
  ('c0000000-0000-4000-8000-000000000090', 'b0000000-0000-4000-8000-000000000024', 'Scale insects', false, 4);

-- Quiz 10: IPM Fundamentals (q37–q40)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-00000000000a',
   'IPM stands for…',
   'Integrated Pest Management combines cultural, biological, mechanical and chemical tools.', 1),
  ('b0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-00000000000a',
   'The first step of any IPM programme is…',
   'Correct pest identification and monitoring guide every later decision.', 2),
  ('b0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-00000000000a',
   'The Economic Injury Level (EIL) is the pest density at which…',
   'EIL is where the cost of control equals the value of damage the pest would cause.', 3),
  ('b0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-00000000000a',
   'Which is an example of cultural control?',
   'Crop rotation, timely sowing and residue destruction reduce pest carryover without sprays.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-000000000091', 'b0000000-0000-4000-8000-000000000025', 'Integrated Pest Management', true, 1),
  ('c0000000-0000-4000-8000-000000000092', 'b0000000-0000-4000-8000-000000000025', 'Integrated Pesticide Management', false, 2),
  ('c0000000-0000-4000-8000-000000000093', 'b0000000-0000-4000-8000-000000000025', 'Intensive Pest Monitoring', false, 3),
  ('c0000000-0000-4000-8000-000000000094', 'b0000000-0000-4000-8000-000000000025', 'International Pest Measure', false, 4),
  ('c0000000-0000-4000-8000-000000000095', 'b0000000-0000-4000-8000-000000000026', 'Identifying the pest and monitoring it', true, 1),
  ('c0000000-0000-4000-8000-000000000096', 'b0000000-0000-4000-8000-000000000026', 'Spraying a broad-spectrum insecticide', false, 2),
  ('c0000000-0000-4000-8000-000000000097', 'b0000000-0000-4000-8000-000000000026', 'Clearing all weeds', false, 3),
  ('c0000000-0000-4000-8000-000000000098', 'b0000000-0000-4000-8000-000000000026', 'Applying fertilizer', false, 4),
  ('c0000000-0000-4000-8000-000000000099', 'b0000000-0000-4000-8000-000000000027', 'Control cost equals the value of crop loss prevented', true, 1),
  ('c0000000-0000-4000-8000-00000000009a', 'b0000000-0000-4000-8000-000000000027', 'The pest first appears in the field', false, 2),
  ('c0000000-0000-4000-8000-00000000009b', 'b0000000-0000-4000-8000-000000000027', 'Crop is completely defoliated', false, 3),
  ('c0000000-0000-4000-8000-00000000009c', 'b0000000-0000-4000-8000-000000000027', 'Natural enemies disappear', false, 4),
  ('c0000000-0000-4000-8000-00000000009d', 'b0000000-0000-4000-8000-000000000028', 'Crop rotation and residue destruction', true, 1),
  ('c0000000-0000-4000-8000-00000000009e', 'b0000000-0000-4000-8000-000000000028', 'Releasing ladybirds', false, 2),
  ('c0000000-0000-4000-8000-00000000009f', 'b0000000-0000-4000-8000-000000000028', 'Pheromone trapping', false, 3),
  ('c0000000-0000-4000-8000-0000000000a0', 'b0000000-0000-4000-8000-000000000028', 'Systemic seed treatment', false, 4);

-- Quiz 11: IPM Strategy (q41–q44)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-00000000000b',
   'The Economic Threshold Level (ETL) is reached when action should be taken…',
   'ETL is the density at which control should be initiated so the pest never reaches the EIL.', 1),
  ('b0000000-0000-4000-8000-00000000002a', 'a0000000-0000-4000-8000-00000000000b',
   'Conservation biological control primarily means…',
   'Protecting and enhancing existing natural enemies through habitat and reduced sprays.', 2),
  ('b0000000-0000-4000-8000-00000000002b', 'a0000000-0000-4000-8000-00000000000b',
   'Which of these is a bio-pesticide?',
   'Bacillus thuringiensis (Bt) is a microbial insecticide widely used in IPM.', 3),
  ('b0000000-0000-4000-8000-00000000002c', 'a0000000-0000-4000-8000-00000000000b',
   'During peak pest season, fields should typically be scouted…',
   'Regular weekly (or twice-weekly in hot weather) scouting is standard during peak season.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-000000000029', 'You should apply control to prevent reaching the EIL', true, 1),
  ('c0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-000000000029', 'You should harvest immediately', false, 2),
  ('c0000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-000000000029', 'You should stop monitoring', false, 3),
  ('c0000000-0000-4000-8000-0000000000a4', 'b0000000-0000-4000-8000-000000000029', 'Crop is already lost', false, 4),
  ('c0000000-0000-4000-8000-0000000000a5', 'b0000000-0000-4000-8000-00000000002a', 'Protecting and promoting existing natural enemies', true, 1),
  ('c0000000-0000-4000-8000-0000000000a6', 'b0000000-0000-4000-8000-00000000002a', 'Importing exotic predators every season', false, 2),
  ('c0000000-0000-4000-8000-0000000000a7', 'b0000000-0000-4000-8000-00000000002a', 'Spraying preservative chemicals', false, 3),
  ('c0000000-0000-4000-8000-0000000000a8', 'b0000000-0000-4000-8000-00000000002a', 'Eliminating all insects except pests', false, 4),
  ('c0000000-0000-4000-8000-0000000000a9', 'b0000000-0000-4000-8000-00000000002b', 'Bacillus thuringiensis (Bt)', true, 1),
  ('c0000000-0000-4000-8000-0000000000aa', 'b0000000-0000-4000-8000-00000000002b', 'Chlorpyrifos', false, 2),
  ('c0000000-0000-4000-8000-0000000000ab', 'b0000000-0000-4000-8000-00000000002b', 'Gramoxone (paraquat)', false, 3),
  ('c0000000-0000-4000-8000-0000000000ac', 'b0000000-0000-4000-8000-00000000002b', 'Glyphosate', false, 4),
  ('c0000000-0000-4000-8000-0000000000ad', 'b0000000-0000-4000-8000-00000000002c', 'Weekly (or more often in hot weather)', true, 1),
  ('c0000000-0000-4000-8000-0000000000ae', 'b0000000-0000-4000-8000-00000000002c', 'Only at harvest', false, 2),
  ('c0000000-0000-4000-8000-0000000000af', 'b0000000-0000-4000-8000-00000000002c', 'Once a month', false, 3),
  ('c0000000-0000-4000-8000-0000000000b0', 'b0000000-0000-4000-8000-00000000002c', 'Never once pest is seen once', false, 4);

-- Quiz 12: Cotton IPM Challenge (q45–q48)
insert into public.quiz_questions (id, quiz_id, question, explanation, "order") values
  ('b0000000-0000-4000-8000-00000000002d', 'a0000000-0000-4000-8000-00000000000c',
   'The early-season cotton sucking-pest complex includes…',
   'Jassid, whitefly, aphid and thrips make up the early sucking-pest complex.', 1),
  ('b0000000-0000-4000-8000-00000000002e', 'a0000000-0000-4000-8000-00000000000c',
   'High whitefly pressure in cotton is especially dangerous because of its role in transmitting…',
   'Whiteflies vector Cotton Leaf Curl Virus (CLCuV), a major yield constraint.', 2),
  ('b0000000-0000-4000-8000-00000000002f', 'a0000000-0000-4000-8000-00000000000c',
   'Which predator is a key whitefly regulator in cotton fields?',
   'Green lacewing larvae and adults are important predators of whitefly and thrips.', 3),
  ('b0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-00000000000c',
   'A non-chemical pillar of pink-bollworm management in cotton is…',
   'Pheromone-based mating disruption and timely sowing/harvest reduce bollworm carryover.', 4);

insert into public.quiz_options (id, question_id, option_text, is_correct, "order") values
  ('c0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-00000000002d', 'Jassid, whitefly, aphid and thrips', true, 1),
  ('c0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-00000000002d', 'Bollworm, cutworm, armyworm', false, 2),
  ('c0000000-0000-4000-8000-0000000000b3', 'b0000000-0000-4000-8000-00000000002d', 'Ladybirds, lacewings, hoverflies', false, 3),
  ('c0000000-0000-4000-8000-0000000000b4', 'b0000000-0000-4000-8000-00000000002d', 'Grasshoppers, crickets, locusts', false, 4),
  ('c0000000-0000-4000-8000-0000000000b5', 'b0000000-0000-4000-8000-00000000002e', 'Cotton Leaf Curl Virus', true, 1),
  ('c0000000-0000-4000-8000-0000000000b6', 'b0000000-0000-4000-8000-00000000002e', 'Papaya ringspot virus', false, 2),
  ('c0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-00000000002e', 'Tomato yellow leaf curl only', false, 3),
  ('c0000000-0000-4000-8000-0000000000b8', 'b0000000-0000-4000-8000-00000000002e', 'Rice grassy stunt virus', false, 4),
  ('c0000000-0000-4000-8000-0000000000b9', 'b0000000-0000-4000-8000-00000000002f', 'Green lacewing (Chrysoperla)', true, 1),
  ('c0000000-0000-4000-8000-0000000000ba', 'b0000000-0000-4000-8000-00000000002f', 'Praying mantis', false, 2),
  ('c0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-00000000002f', 'Dragonfly', false, 3),
  ('c0000000-0000-4000-8000-0000000000bc', 'b0000000-0000-4000-8000-00000000002f', 'House cricket', false, 4),
  ('c0000000-0000-4000-8000-0000000000bd', 'b0000000-0000-4000-8000-000000000030', 'Pheromone mating disruption with timely crop management', true, 1),
  ('c0000000-0000-4000-8000-0000000000be', 'b0000000-0000-4000-8000-000000000030', 'Broad-spectrum fortnightly sprays', false, 2),
  ('c0000000-0000-4000-8000-0000000000bf', 'b0000000-0000-4000-8000-000000000030', 'Leaving bolls on the plant over winter', false, 3),
  ('c0000000-0000-4000-8000-0000000000c0', 'b0000000-0000-4000-8000-000000000030', 'Fertilising more heavily at boll stage', false, 4);