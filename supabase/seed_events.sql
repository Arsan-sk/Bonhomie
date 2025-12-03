-- Cultural Events
INSERT INTO public.events (name, category, subcategory, day, day_order, description, fee, min_team_size, max_team_size, is_active) VALUES
('Mehndi', 'Cultural', 'Individual', 'Day 1', 1, 'Showcase your artistic skills with intricate Mehndi designs.', 50, 1, 1, true),
('Rangoli', 'Cultural', 'Individual', 'Day 1', 1, 'Create colorful patterns and designs on the floor.', 50, 1, 1, true),
('Cooking Competition', 'Cultural', 'Group', 'Day 1', 1, 'Fireless cooking competition. Prepare delicious dishes.', 50, 2, 4, true),
('Qirat', 'Cultural', 'Individual', 'Day 2', 2, 'Quran recitation competition.', 50, 1, 1, true),
('Treasure Hunt', 'Cultural', 'Group', 'Day 2', 2, 'Solve clues and find the hidden treasure.', 200, 3, 5, true),
('Hamd-O-Naat', 'Cultural', 'Individual', 'Day 2', 2, 'Recitation of Hamd and Naat.', 50, 1, 1, true),
('Mushaira', 'Cultural', 'Individual', 'Day 3', 3, 'Poetry recitation competition.', 50, 1, 1, true),
('Debate', 'Cultural', 'Individual', 'Day 3', 3, 'Express your views on the given topic.', 50, 1, 1, true),
('Zaika', 'Cultural', 'Group', 'Day 3', 3, 'Food stall competition.', 500, 2, 5, true),
('Extempore', 'Cultural', 'Individual', 'Day 4', 4, 'Speak on a random topic for 2 minutes.', 50, 1, 1, true),
('Short Film', 'Cultural', 'Group', 'Day 4', 4, 'Create a short film on a given theme.', 100, 1, 5, true),
('Calligraphy', 'Cultural', 'Individual', 'Day 4', 4, 'Artistic writing competition.', 50, 1, 1, true),
('Pot Painting', 'Cultural', 'Individual', 'Day 5', 5, 'Paint and decorate pots creatively.', 50, 1, 1, true),
('Stand-up Comedy', 'Cultural', 'Individual', 'Day 5', 5, 'Make the audience laugh with your jokes.', 50, 1, 1, true),
('Doodling', 'Cultural', 'Individual', 'Day 5', 5, 'Create creative doodles.', 50, 1, 1, true),
('Lippan Art', 'Cultural', 'Individual', 'Day 6', 6, 'Traditional mud and mirror art.', 50, 1, 1, true),
('Speed Portrait', 'Cultural', 'Individual', 'Day 6', 6, 'Draw a portrait within a limited time.', 50, 1, 1, true),
('Beatboxing', 'Cultural', 'Individual', 'Day 6', 6, 'Showcase your beatboxing skills.', 50, 1, 1, true),
('Vlog', 'Cultural', 'Individual', 'Day 6', 6, 'Create a vlog covering the fest.', 50, 1, 1, true),
('Vernacular Speech', 'Cultural', 'Individual', 'Day 6', 6, 'Speech competition in regional languages.', 50, 1, 1, true);

-- Sports Events
INSERT INTO public.events (name, category, subcategory, day, day_order, description, fee, min_team_size, max_team_size, is_active) VALUES
('Chess', 'Sports', 'Individual', 'Day 1', 1, 'Strategic board game.', 50, 1, 1, true),
('Carrom', 'Sports', 'Individual', 'Day 1', 1, 'Strike and pocket the coins.', 50, 1, 1, true),
('Race 100M', 'Sports', 'Individual', 'Day 2', 2, '100 meters sprint race.', 50, 1, 1, true),
('Discus Throw', 'Sports', 'Individual', 'Day 2', 2, 'Throw the heavy disc as far as possible.', 50, 1, 1, true),
('Shot Put', 'Sports', 'Individual', 'Day 2', 2, 'Throw the heavy metal ball.', 50, 1, 1, true),
('Badminton', 'Sports', 'Individual', 'Day 3', 3, 'Badminton singles tournament.', 50, 1, 1, true),
('Push Up', 'Sports', 'Individual', 'Day 3', 3, 'Maximum push-ups challenge.', 50, 1, 1, true),
('Table Tennis', 'Sports', 'Individual', 'Day 3', 3, 'Table tennis singles tournament.', 50, 1, 1, true),
('Cricket', 'Sports', 'Group', 'Day 4', 4, 'Standard cricket tournament.', 500, 11, 15, true),
('Football', 'Sports', 'Group', 'Day 4', 4, '5-a-side football tournament.', 300, 5, 8, true),
('Volleyball', 'Sports', 'Group', 'Day 4', 4, 'Volleyball tournament.', 300, 6, 9, true),
('Box Cricket', 'Sports', 'Group', 'Day 5', 5, 'Underarm cricket in a box.', 300, 7, 10, true),
('BGMI', 'Sports', 'Group', 'Day 5', 5, 'Battlegrounds Mobile India tournament.', 200, 4, 4, true),
('Arm Wrestling', 'Sports', 'Individual', 'Day 5', 5, 'Test your arm strength.', 50, 1, 1, true),
('Throw Ball', 'Sports', 'Group', 'Day 5', 5, 'Throw ball tournament for girls.', 200, 7, 10, true),
('Relay Race', 'Sports', 'Group', 'Day 6', 6, '4x100m relay race.', 100, 4, 4, true),
('Tug of War', 'Sports', 'Group', 'Day 6', 6, 'Test of strength between two teams.', 200, 8, 10, true),
('Three-Leg Race', 'Sports', 'Group', 'Day 6', 6, 'Fun race for pairs.', 50, 2, 2, true),
('Free Fire', 'Sports', 'Group', 'Day 6', 6, 'Free Fire mobile game tournament.', 200, 4, 4, true),
('Valorant', 'Sports', 'Group', 'Day 6', 6, '5v5 tactical shooter tournament.', 250, 5, 5, true);

-- Technical Events
INSERT INTO public.events (name, category, subcategory, day, day_order, description, fee, min_team_size, max_team_size, is_active) VALUES
('AutoCAD', 'Technical', 'Individual', 'Day 2', 2, 'Design and drafting competition using AutoCAD.', 50, 1, 1, true),
('Sustainable Development Poster', 'Technical', 'Individual', 'Day 3', 3, 'Poster presentation on sustainable development goals.', 100, 1, 3, true);
