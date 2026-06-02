# Profile editing & Forgot password flow

## Features

### Profile Editing in Settings

- A new "My Profile" option in the Account section of Settings
- Edit screen with fields for Name, Email, Phone Number, and Change Password
- Name and Phone update instantly in the database
- Email change sends a confirmation to the new address (via Supabase)
- Password change requires current password + new password confirmation

### Forgot Password Flow

- Accessible from both the Login page ("Forgot Password?" button) and Settings
- **Step 1**: Enter your email address
- **Step 2**: Choose delivery method — Email or Phone
- **Step 3**: A 4-digit confirmation code is sent. A code entry popup appears with 4 input boxes
- **Step 4**: A 60-second countdown timer shows at the bottom with a "Resend" button next to it
- **Step 5**: After entering the correct code, user sets a new password
- Tapping "Resend" re-sends the code to the previously chosen method and restarts the countdown

## Design

- Profile screen follows the existing Settings pattern with grouped cards and clean form fields
- Forgot password uses a modal/popup design with the code entry boxes prominently centered
- Countdown timer displayed as "Resend in 0:XX" with the Resend button disabled until it hits 0
- Consistent dark theme with mint accents matching the rest of the app

## Pages / Screens

- **Settings → My Profile** — Edit name, email, phone, and change password
- **Forgot Password screen** — Email entry → method choice → code verification → new password

