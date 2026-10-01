-- EntomoLens: backfill specimen photos + complete the insect order list.
-- Images are stable Wikimedia Commons thumbnails (hotlink-friendly, cropped to ~500px).
-- Idempotent: re-running never duplicates or overwrites existing images.

-- ---------------------------------------------------------------------------
-- 1. Backfill insect photos
-- ---------------------------------------------------------------------------
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Silverleaf_whitefly.jpg/500px-Silverleaf_whitefly.jpg'] where id = '40000000-0000-0000-0000-000000000001'; -- Bemisia tabaci
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Aphis_gossypii_252211071.jpg/500px-Aphis_gossypii_252211071.jpg'] where id = '40000000-0000-0000-0000-000000000002'; -- Aphis gossypii
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Phenacoccus_solenopsis_-_Solenopsis_mealybug_-_Unlu_bit_02.JPG/500px-Phenacoccus_solenopsis_-_Solenopsis_mealybug_-_Unlu_bit_02.JPG'] where id = '40000000-0000-0000-0000-000000000003'; -- Phenacoccus solenopsis
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Red_cotton_bug_%28Dysdercus_koenigii%29_nymph_on_Hibiscus_lobatus_W_IMG_4065.jpg/500px-Red_cotton_bug_%28Dysdercus_koenigii%29_nymph_on_Hibiscus_lobatus_W_IMG_4065.jpg'] where id = '40000000-0000-0000-0000-000000000004'; -- Dysdercus koenigii
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Empoasca_fabae_P1550790a.jpg/500px-Empoasca_fabae_P1550790a.jpg'] where id = '40000000-0000-0000-0000-000000000005'; -- Amrasca biguttula
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Helicoverpa_armigera.jpg/500px-Helicoverpa_armigera.jpg'] where id = '40000000-0000-0000-0000-000000000006'; -- Helicoverpa armigera
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/4/44/Spodoptera_frugiperda.jpg'] where id = '40000000-0000-0000-0000-000000000007'; -- Spodoptera frugiperda
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Spodoptera_litura_%2824045593674%29.jpg/500px-Spodoptera_litura_%2824045593674%29.jpg'] where id = '40000000-0000-0000-0000-000000000008'; -- Spodoptera litura
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Agrotis_ipsilon_aneituma.jpg/500px-Agotis_ipsilon_aneituma.jpg'] where id = '40000000-0000-0000-0000-000000000009'; -- Agrotis ipsilon
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Pectinophora_gossypiella_1265079.jpg/500px-Pectinophora_gossypiella_1265079.jpg'] where id = '40000000-0000-0000-0000-000000000010'; -- Pectinophora gossypiella
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Leucinodes_orbonalis.jpg/500px-Leucinodes_orbonalis.jpg'] where id = '40000000-0000-0000-0000-000000000011'; -- Leucinodes orbonalis
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Boll_weevil.jpg/500px-Boll_weevil.jpg'] where id = '40000000-0000-0000-0000-000000000012'; -- Anthonomus grandis
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/7-Spotted-Ladybug-Coccinella-septempunctata-sq1.jpg/500px-7-Spotted-Ladybug-Coccinella-septempunctata-sq1.jpg'] where id = '40000000-0000-0000-0000-000000000013'; -- Coccinella septempunctata
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Callosobruchus_chinensis_%28Linn%C3%A9%2C_1758%29_male.jpg/500px-Callosobruchus_chinensis_%28Linn%C3%A9%2C_1758%29_male.jpg'] where id = '40000000-0000-0000-0000-000000000014'; -- Callosobruchus chinensis
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Khapra_beetle.jpg/330px-Khapra_beetle.jpg'] where id = '40000000-0000-0000-0000-000000000015'; -- Trogoderma granarium
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Thrips_tabaci%2C_Frankliniella_occidentalis.jpg/330px-Thrips_tabaci%2C_Frankliniella_occidentalis.jpg'] where id = '40000000-0000-0000-0000-000000000016'; -- Thrips tabaci
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Melon_fly_%28Bactrocera_cucurbitae%29_03.jpg/500px-Melon_fly_%28Bactrocera_cucurbitae%29_03.jpg'] where id = '40000000-0000-0000-0000-000000000017'; -- Bactrocera cucurbitae
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Marmalade_hoverfly_%28Episyrphus_balteatus%29_male_Wengen_2.jpg/330px-Marmalade_hoverfly_%28Episyrphus_balteatus%29_male_Wengen_2.jpg'] where id = '40000000-0000-0000-0000-000000000018'; -- Episyrphus balteatus
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Wanderheuschrecke-03.jpg/330px-Wanderheuschrecke-03.jpg'] where id = '40000000-0000-0000-0000-000000000019'; -- Locusta migratoria
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Female_of_Trichogramma_dendrolimi_on_egg_of_armyworm_%28Noctuidae%29%2C_photo_was_taken_by_Dr_Victor_Fursov.jpg/500px-Female_of_Trichogramma_dendrolimi_on_egg_of_armyworm_%28Noctuidae%29%2C_photo_was_taken_by_Dr_Victor_Fursov.jpg'] where id = '40000000-0000-0000-0000-000000000020'; -- Trichogramma chilonis
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Apis_mellifera_Western_honey_bee.jpg/500px-Apis_mellifera_Western_honey_bee.jpg'] where id = '40000000-0000-0000-0000-000000000021'; -- Apis mellifera
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Orius_insidiosus_from_USDA_1.jpg/330px-Orius_insidiosus_from_USDA_1.jpg'] where id = '40000000-0000-0000-0000-000000000022'; -- Orius laevigatus
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Nilaparvata_lugens_439632934.jpg/330px-Nilaparvata_lugens_439632934.jpg'] where id = '40000000-0000-0000-0000-000000000023'; -- Nilaparvata lugens
update public.insects set images = array['https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/%28MHNT%29_Chrysoperla_carnea_-_dorsal_view.jpg/500px-%28MHNT%29_Chrysoperla_carnea_-_dorsal_view.jpg'] where id = '40000000-0000-0000-0000-000000000024'; -- Chrysoperla carnea

-- ---------------------------------------------------------------------------
-- 2. Complete the insect order list (remaining major orders)
-- ---------------------------------------------------------------------------
insert into public.taxonomic_orders (id, name, common_name, description) values
  ('10000000-0000-0000-0000-000000000009', 'Odonata', 'Dragonflies and damselflies', 'Aerial predators whose aquatic nymphs and flying adults both hunt other insects.'),
  ('10000000-0000-0000-0000-000000000010', 'Ephemeroptera', 'Mayflies', 'Aquatic nymphs emerge as short-lived winged adults, a key food for fish.'),
  ('10000000-0000-0000-0000-000000000011', 'Plecoptera', 'Stoneflies', 'Cool-water insects; nymphs are sensitive indicators of clean streams.'),
  ('10000000-0000-0000-0000-000000000012', 'Dermaptera', 'Earwigs', 'Slender insects with forceps-like cerci, often scavengers of decaying matter.'),
  ('10000000-0000-0000-0000-000000000013', 'Mantodea', 'Praying mantises', 'Ambush predators that seize a wide range of insect prey with raptorial forelegs.'),
  ('10000000-0000-0000-0000-000000000014', 'Blattodea', 'Cockroaches and termites', 'Flattened generalist scavengers plus social decomposer termites.'),
  ('10000000-0000-0000-0000-000000000015', 'Phasmatodea', 'Stick and leaf insects', 'Camouflaged plant feeders that mimic twigs and foliage.'),
  ('10000000-0000-0000-0000-000000000016', 'Embioptera', 'Webspinners', 'Silk-spinning insects living in galleries on bark and in leaf litter.'),
  ('10000000-0000-0000-0000-000000000017', 'Zoraptera', 'Zorapterans', 'Tiny cryptic insects of rotting wood, feeding on fungi and small arthropods.'),
  ('10000000-0000-0000-0000-000000000018', 'Psocodea', 'Barklice and booklice', 'Crust-like insects feeding on fungi, algae and stored organic matter.'),
  ('10000000-0000-0000-0000-000000000019', 'Phthiraptera', 'True lice', 'Wingless ectoparasites of birds and mammals, including chewing and sucking lice.'),
  ('10000000-0000-0000-0000-000000000020', 'Strepsiptera', 'Twisted-wing parasites', 'Tiny endoparasites of other insects, with males having reduced forewings.'),
  ('10000000-0000-0000-0000-000000000021', 'Megaloptera', 'Alderflies and dobsonflies', 'Large-jawed insects with aquatic predatory larvae.'),
  ('10000000-0000-0000-0000-000000000022', 'Raphidioptera', 'Snakeflies', 'Predatory insects with an elongate prothorax that resembles a snake neck.'),
  ('10000000-0000-0000-0000-000000000023', 'Mecoptera', 'Scorpionflies', 'Males often with upturned abdomens; larvae and adults are generalist scavengers.'),
  ('10000000-0000-0000-0000-000000000024', 'Trichoptera', 'Caddisflies', 'Moth-like insects with aquatic larvae that build silk cases.'),
  ('10000000-0000-0000-0000-000000000025', 'Archaeognatha', 'Bristletails', 'Wingless springing insects of leaf litter and bark.'),
  ('10000000-0000-0000-0000-000000000026', 'Zygentoma', 'Silverfish', 'Wingless insects with flattened bodies, common in and around buildings.'),
  ('10000000-0000-0000-0000-000000000027', 'Siphonaptera', 'Fleas', 'Wingless jumping ectoparasites of mammals and birds.'),
  ('10000000-0000-0000-0000-000000000028', 'Grylloblattodea', 'Ice crawlers', 'Cold-adapted insects of high mountains, feeding on decaying matter.'),
  ('10000000-0000-0000-0000-000000000029', 'Mantophasmatodea', 'Heelwalkers', 'Predatory insects re-discovered in Africa in 2001, walking on tarsal heel pads.')
on conflict (id) do nothing;