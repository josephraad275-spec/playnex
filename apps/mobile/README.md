# Native release preparation

The current product is browser-first. No Android or iOS binary is generated or published. Capacitor is the recommended evaluation path after the web beta passes multiplayer, accessibility, security, and real-device checks.

Do not install a web wrapper and assume store acceptance. Before adding native projects, review current Apple App Review Guidelines (including minimum functionality, remote software/game distribution, privacy and purchase rules) and Google Play policies (including user data, families, account deletion and billing). Record review dates in docs/STORE_RELEASE.md.

Required follow-up: founder-authorized application IDs, icons/splashes, HTTPS app links and associated domains, native share and back navigation, offline UX, safe-area handling, privacy manifests/disclosures, signed builds on supported tooling, physical-device testing and store review. iOS signing/builds require an authorized Apple account and macOS. Purchases and developer accounts require explicit approval.
