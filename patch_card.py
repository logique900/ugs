import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

old_card_details = """                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-1 line-clamp-1 group-hover:text-red-700 transition-colors">{projet.nom}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2 min-h-[40px]">{projet.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl mb-4">
                      <div>
                        <span className="text-gray-500 block">Responsable:</span>
                        <span className="font-bold text-on-surface truncate block">{projet.responsable}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Création:</span>
                        <span className="font-semibold text-on-surface">{projet.dateCreation}</span>
                      </div>
                    </div>"""

new_card_details = """                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-title-lg text-title-lg text-on-surface font-bold line-clamp-1 group-hover:text-red-700 transition-colors">{projet.nom}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">{projet.codeBoutique || 'SANS CODE'}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2 min-h-[40px]">{projet.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl mb-4">
                      <div>
                        <span className="text-gray-500 block">Ville:</span>
                        <span className="font-bold text-on-surface truncate block">{projet.ville || 'Non spécifiée'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Responsable:</span>
                        <span className="font-semibold text-on-surface truncate block">{projet.responsable || 'Non assigné'}</span>
                      </div>
                    </div>"""

if old_card_details in content:
    content = content.replace(old_card_details, new_card_details)
else:
    print("Could not find card details to replace.")

with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)
