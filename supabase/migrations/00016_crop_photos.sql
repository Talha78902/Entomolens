-- 00016_crop_photos
--
-- Adds a photo and its attribution to all 12 crops.
--
-- Why this exists
-- ---------------
-- The `crops.image_url` column has always existed but was never populated, so
-- /crops showed a generic Sprout icon for every crop. The photos come from
-- iNaturalist under the same licence policy as the species set: research-grade,
-- non-cultivated observations, CC0 preferred, CC-BY accepted with attribution,
-- and NC/ND rejected outright because this is an agricultural extension site
-- whose non-commercial terms we cannot promise to honour later.
--
-- Attribution
-- -----------
-- 10 of the 12 are CC0 and need nothing. Two are CC BY and legally require the
-- photographer to be credited wherever the image appears. The `crops` table has
-- no dedicated attribution column, so the credit is appended to `description`,
-- which the crop page already renders — the same approach 00015 uses for the
-- attributed insect photos.
--
-- Files are published to the public `insect-images` bucket as:
--   insect-images/cotton.jpg, wheat.jpg, maize.jpg, rice.jpg, tomato.jpg,
--   okra.jpg, chickpea.jpg, sugarcane.jpg, potato.jpg, brinjal.jpg,
--   chilli.jpg, cucumber.jpg
--
-- Upload the objects before running this, or every image_url will 404:
--   node scripts/host-crop-photos.mjs --upload
--
-- Idempotent: re-running rewrites the same values and re-appends nothing,
-- because the credit is only added when it is not already present.

with source (crop_name, image_ref, credit) as (
  values
    ('Cotton',     'insect-images/cotton.jpg',     null),
    ('Wheat',      'insect-images/wheat.jpg',      null),
    ('Maize',      'insect-images/maize.jpg',      null),
    ('Rice',       'insect-images/rice.jpg',       null),
    ('Tomato',     'insect-images/tomato.jpg',     null),
    ('Okra',       'insect-images/okra.jpg',       null),
    ('Chickpea',   'insect-images/chickpea.jpg',
     'Photographer credit for the image: (c) Nico Hernandez, CC BY, via iNaturalist observation https://www.inaturalist.org/observations/52851661.'),
    ('Sugarcane',  'insect-images/sugarcane.jpg',  null),
    ('Potato',     'insect-images/potato.jpg',     null),
    ('Brinjal',    'insect-images/brinjal.jpg',
     'Photographer credit for the image: (c) Krzysztof Ziarnek, CC BY, via iNaturalist observation https://www.inaturalist.org/observations/402502701.'),
    ('Chilli',     'insect-images/chilli.jpg',     null),
    ('Cucumber',   'insect-images/cucumber.jpg',   null)
)
update public.crops c
set image_url = s.image_ref
from source s
where lower(c.name) = lower(s.crop_name);

-- Append the two CC-BY credits to the description the crop page already shows.
-- Guarded on the credit being absent, so a re-run cannot duplicate the line.
update public.crops c
set description = c.description || ' ' || s.credit
from source s
where lower(c.name) = lower(s.crop_name)
  and s.credit is not null
  and (c.description is null or c.description not like '%' || s.credit || '%');

-- Expect: 12 rows with an image_url, and 2 credits in place.
select
  count(*) filter (where image_url is not null) as crops_with_image,
  count(*) filter (where description like '%CC BY%') as attributed_crops
from public.crops;
