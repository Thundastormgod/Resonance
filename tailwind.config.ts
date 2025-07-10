
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'serif': ['Playfair Display', 'Times New Roman', 'Georgia', 'serif'],
				'sans': ['Inter', 'Open Sans', 'system-ui', 'sans-serif'],
				'mono': ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
			},
			colors: {
				// Enhanced newspaper graded grey-brown palette
				'newsprint': {
					50: '#faf9f7',   // Lightest cream
					100: '#f5f3f0',  // Light cream
					200: '#ebe6df',  // Warm grey
					300: '#ddd5cb',  // Medium warm grey
					400: '#c9bdb0',  // Darker warm grey
					500: '#b5a394',  // Mid brown-grey
					600: '#9d8a7a',  // Darker brown-grey
					700: '#847165',  // Dark brown
					800: '#6b5d54',  // Very dark brown
					900: '#574d46',  // Almost black brown
				},
				'ink': {
					50: '#f8f8f8',   // Very light grey
					100: '#e8e8e8',  // Light grey
					200: '#d3d3d3',  // Medium light grey
					300: '#b8b8b8',  // Medium grey
					400: '#8a8a8a',  // Dark grey
					500: '#6d6d6d',  // Darker grey
					600: '#5d5d5d',  // Very dark grey
					700: '#4f4f4f',  // Almost black
					800: '#454545',  // Near black
					900: '#2d2d2d',  // True newspaper black
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'typewriter': {
					'0%': { width: '0' },
					'100%': { width: '100%' }
				},
				'blink': {
					'0%, 50%': { borderColor: 'transparent' },
					'51%, 100%': { borderColor: 'currentColor' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'slide-up': 'slide-up 0.6s ease-out',
				'typewriter': 'typewriter 2s steps(40) 1s forwards',
				'blink': 'blink 1s infinite'
			},
			backgroundImage: {
				'newspaper-texture': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'%3E%3Cg fill=\'%23f5f3f0\' fill-opacity=\'0.03\'%3E%3Cpolygon points=\'10 0 20 10 10 20 0 10\'/%3E%3C/g%3E%3C/svg%3E")',
				'dot-pattern': 'radial-gradient(circle at 1px 1px, rgba(87, 77, 69, 0.15) 1px, transparent 0)',
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
