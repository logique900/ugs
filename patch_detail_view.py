import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

old_details = """                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Description de la boutique</p>
                <p className="text-sm text-on-surface font-medium leading-relaxed">{selectedProjectModal.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-outline-variant/60 text-xs">
                  <div>
                    <span className="text-on-surface-variant font-semibold">Responsable Désigné:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.responsable}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant font-semibold">Date d'Ouverture:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.dateCreation}</p>
                  </div>
                </div>"""

new_details = """                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Description & Localisation</p>
                <p className="text-sm text-on-surface font-medium leading-relaxed">{selectedProjectModal.description}</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-outline-variant/60 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-on-surface-variant font-semibold">Code:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.codeBoutique || '---'}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-on-surface-variant font-semibold">Ville:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.ville || '---'}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className="text-on-surface-variant font-semibold">Adresse:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.adresse || '---'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-outline-variant/60 text-xs">
                  <div>
                    <span className="text-on-surface-variant font-semibold">Responsable:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.responsable}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant font-semibold">Téléphone:</span>
                    <p className="text-sm font-bold text-on-surface">{selectedProjectModal.telephone || '---'}</p>
                  </div>
                </div>"""

if old_details in content:
    content = content.replace(old_details, new_details)
else:
    print("Detail view not found.")

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)
