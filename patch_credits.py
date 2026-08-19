import re

with open('src/components/Credits.tsx', 'r') as f:
    content = f.read()

old_interface = """interface CreditsProps {
  currentUser: Utilisateur;
  selectedProjectId: string;
  clients: Client[];"""

new_interface = """import { Article } from '../types';

interface CreditsProps {
  currentUser: Utilisateur;
  articles?: Article[];
  selectedProjectId: string;
  clients: Client[];"""

if old_interface in content:
    content = content.replace(old_interface, new_interface)

with open('src/components/Credits.tsx', 'w') as f:
    f.write(content)

