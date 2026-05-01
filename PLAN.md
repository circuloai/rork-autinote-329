# Populate Supabase with demo data for your account

## What I'll do

I'll give you a SQL script to paste into a new Supabase SQL snippet that fills your empty tables with realistic demo data, tied to the account you're currently logged into.

## What you'll see after running it

- **Your parent profile**: Sarah Johnson with phone and email filled in
- **A child** with a name, age, diagnosis, and a few sample goals
- **Daily logs** (sleep, meals, mood, behaviors) for the past several days so charts and history look alive
- **A demo therapist account** ("therapist.demo@example.com") already connected to you as an accepted shared-access connection
- **A therapist note** with a parent comment reply, so the notes screen has content
- **A second pending invitation** so you can see how a not-yet-accepted invite looks on the Shared Access screen

## How it stays safe

- The script auto-detects your most recently created user — no need to paste any IDs
- It uses upserts, so running it more than once won't create duplicates
- It only adds rows; it does not drop or alter any tables
- If your real invite to `kalegaur+1@gmail.com` already exists, it stays untouched

## After running

Reload the app and you should see:
- A populated home screen with your child and recent activity
- The Shared Access screen showing the demo therapist as **Accepted** plus any real pending invites
- The Therapists screen (when logged in as the demo therapist, if you want) showing Sarah's family as a client
