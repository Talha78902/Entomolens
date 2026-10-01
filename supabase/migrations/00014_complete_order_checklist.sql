-- ---------------------------------------------------------------------------
-- 00014: Complete the insect order checklist
--
-- The seed data only ever listed the 8 orders that the 24 museum specimens
-- happened to belong to, so both /taxonomy and the /museum order filter read as
-- though the class contained only those. Real insects span roughly 28 currently
-- recognised extant orders, and the number moves with each phylogenetic
-- revision.
--
-- 00011 already adds a block of orders under the id range
-- 10000000-...-0009 through -0029, and its names do not line up with this file's.
-- An earlier version of this migration reused those same ids for different
-- orders. Because the id is a primary key, `on conflict (name)` does not catch
-- that, so on a fresh database 00011 runs first, claims the ids, and this
-- migration then aborted on the very first row and rolled back all 20 of them.
--
-- The fix is to let the database assign the ids. No row outside 00007 and 00008
-- references an order id literally, and 00014 only ever runs before the species
-- that point at these orders, so generated ids are safe and this migration is
-- now independent of whatever 00011 happened to insert.
--
-- Result: 8 existing + 20 added here = 28 extant orders.
--
-- Several textbook orders are deliberately absent because modern phylogeny
-- subsumes them:
--   Isoptera      -> suborder of Blattodea (termites)
--   Phthiraptera  -> suborder of Psocodea (chewing and sucking lice)
--   Homoptera     -> dissolved into Hemiptera as Sternorrhyncha
--   Thysanura     -> split into Archaeognatha and Zygentoma
--   Dictyoptera   -> superorder covering Mantodea and Blattodea
--
-- Orders with no representative species yet are still listed. That is
-- deliberate: an empty order is a visible gap in the collection, whereas a
-- missing order is invisible and reads as ignorance of the class.
-- ---------------------------------------------------------------------------

insert into public.taxonomic_orders (name, common_name, description) values
  ('Archaeognatha',      'Bristletails',
   'Primitive wingless insects that leap and are found on damp rock near streams. Includes jumping bristletails.'),
  ('Zygentoma',         'Silverfish and firebrats',
   'Wingless scavengers of damp organic matter that nibble starch in books, wallpaper and stored grain.'),
  ('Ephemeroptera',     'Mayflies',
   'Aquatic nymphs with feathered or plate-like gills; the short-lived winged adults are a vital fish food source.'),
  ('Odonata',           'Dragonflies and damselflies',
   'Nymphs are aquatic predators; adults are aggressive hunters of flying insects and are strong indicators of clean water.'),
  ('Plecoptera',        'Stoneflies',
   'Aquatic nymphs that need well-oxygenated water, so they signal unpolluted streams. Adults are short-lived and weak fliers.'),
  ('Dermaptera',        'Earwigs',
   'Forceps-like pincers at the abdomen tip. Omnivorous scavengers that can become minor pests of soft fruit and seedlings.'),
  ('Zoraptera',         'Angel insects',
   'Tiny, gregarious, wingless or dimorphic insects living in leaf litter and damp decaying wood.'),
  ('Mantodea',          'Praying mantises',
   'Raptorial predators of insects including crop pests, making them beneficial generalists in field vegetation.'),
  ('Blattodea',         'Cockroaches and termites',
   'Includes the termites, the most damaging insect group on crops worldwide, plus the omnivorous cockroaches.'),
  ('Grylloblattodea',   'Rock crawlers',
   'Rare, cold-adapted chewing insects restricted to high mountains and glacier margins; effectively never pests of crops.'),
  ('Mantophasmatodea',  'Gladiator insects',
   'A small order from southern Africa whose members both ambush prey and show parental care, earning the name "gladiator".'),
  ('Phasmatodea',       'Stick and leaf insects',
   'Camouflaged herbivores that feed on foliage. Heavily defended with chemical secretions and mimicry rather than speed.'),
  ('Embioptera',        'Webspinners',
   'Spin silk galleries in silk from glands on the front legs; live in colonies in leaf litter and bark crevices.'),
  ('Psocodea',          'Barklice, booklice and parasitic lice',
   'A merged order: free-living barklice that graze algae and fungi, plus the parasitic sucking and chewing lice.'),
  ('Megaloptera',       'Alderflies, dobsonflies and fishflies',
   'Large soft-bodied aquatic larvae; the dobsonfly larvae are hellgrammites. Adults are short-lived and feed little.'),
  ('Raphidioptera',     'Snakeflies',
   'Predatory insects with a long flexible neck used to grab prey, mainly predators of soft-bodied arthropods.'),
  ('Mecoptera',         'Scorpionflies and hangingflies',
   'Distinctive elongated beak-like mouthparts; includes the Mecoptera sensu lato group alongside fleas and lacewings.'),
  ('Siphonaptera',      'Fleas',
   'Laterally flattened, wingless, jumping blood-sucking ectoparasites of mammals, vectors of plague and tapeworms.'),
  ('Trichoptera',       'Caddisflies',
   'Caddisfly larvae are aquatic and build cases of sand, silk or plant debris; used as clean-water indicators.'),
  ('Strepsiptera',      'Twisted-wing parasites',
   'Highly specialised endoparasites, males emerge twisted-winged to mate. Rarely observed as free-living adults.')
on conflict (name) do nothing;

-- 00011 can leave Phthiraptera behind on a fresh database. It is now a
-- suborder of Psocodea, so drop it, but only while nothing references it:
-- insects.family_id and taxonomic_families.order_id are both ON DELETE RESTRICT.
delete from public.taxonomic_orders o
where o.name = 'Phthiraptera'
  and not exists (select 1 from public.insects i where i.order_id = o.id)
  and not exists (select 1 from public.taxonomic_families f where f.order_id = o.id);
