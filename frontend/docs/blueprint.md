# **App Name**: Joy UI Platform

## Core Features:

- Centralized Order Management: Automatically centralize orders from multiple Shopify stores using the Shopify API and webhooks.
- Role-Based Access Control: Implement Admin and Travel Agent roles with distinct permissions for data access and editing within the JoyBooking module and integration to other modules like JoyOne.
- Dynamic Room Type Assignment: Automatically assign room types based on PAX and admin-defined rules, with the option for travel agents to override these assignments.
- Supplement Management: Manage order supplements (labels and amounts) to be added on top of order payments.
- Tour Code Assignment Suggestions: The application will make suggested assignments of tours codes based on previously existing mapping.
- PWA Configuration: Configure the Joy UI as a Progressive Web App (PWA) with manifest.json and service worker for installability, offline support, and push notifications.
- Shared UI Component Library: Maintain a shared UI component library (@joy/ui) within a monorepo (Turborepo or Nx) for consistent styling and reusable components across all Joy apps (Joy One, Joy Desk, Joy Connect, Joy Booking).

## Style Guidelines:

- Primary color: Vibrant blue (#29ABE2) to reflect reliability and trust.
- Background color: Light blue (#E1F5FE), a desaturated variant of the primary hue for a clean and calming backdrop.
- Accent color: Analogous green (#9CCC65) to the blue to provide contrast for key CTAs and interactive elements.
- Headline font: 'Space Grotesk' (sans-serif) for headlines and short body texts to provide a modern and slightly tech-inspired look; use 'Inter' for longer body text
- Code font: 'Source Code Pro' (monospace) for displaying code snippets within the UI.
- Use a consistent layout across all Joy apps with a sidebar, top bar, and main content area, optimized for admin-style UIs.
- Employ clear and intuitive icons from 'lucide-react' to enhance navigation and user experience.