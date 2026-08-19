import re

with open('src/components/Articles.tsx', 'r') as f:
    content = f.read()

# 1. Update Props and Component Signature
content = content.replace(
    "interface ArticlesProps {",
    "import { Utilisateur } from '../types';\n\ninterface ArticlesProps {\n  currentUser: Utilisateur;"
)
content = content.replace(
    "export function Articles({ selectedProjectId, articles, onArticlesChange, projets }: ArticlesProps) {",
    "export function Articles({ currentUser, selectedProjectId, articles, onArticlesChange, projets }: ArticlesProps) {"
)

# 2. Hide specific actions if role === 'caissier'
old_header = """      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Référentiel Articles</h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Gérez le catalogue des produits et les tarifs.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedArticles.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-error/10 text-error hover:bg-error/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
              Supprimer ({selectedArticles.length})
            </button>
          )}
          <button 
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nouvel Article
          </button>
        </div>
      </div>"""

new_header = """      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Référentiel Articles</h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Gérez le catalogue des produits et les tarifs.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedArticles.length > 0 && currentUser.role !== 'caissier' && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-error/10 text-error hover:bg-error/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
              Supprimer ({selectedArticles.length})
            </button>
          )}
          {currentUser.role !== 'caissier' && (
            <button 
              onClick={handleOpenCreateModal}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nouvel Article
            </button>
          )}
        </div>
      </div>"""

content = content.replace(old_header, new_header)

old_table_actions = """                    <td className="px-4 py-4 text-right space-x-1">
                      <button 
                        onClick={() => handleOpenEditModal(article)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" 
                        title="Modifier"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteArticle(article.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer" 
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>"""

new_table_actions = """                    <td className="px-4 py-4 text-right space-x-1">
                      {currentUser.role !== 'caissier' ? (
                        <>
                          <button 
                            onClick={() => handleOpenEditModal(article)}
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" 
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteArticle(article.id)}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer" 
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-on-surface-variant italic">Lecture seule</span>
                      )}
                    </td>"""

content = content.replace(old_table_actions, new_table_actions)

with open('src/components/Articles.tsx', 'w') as f:
    f.write(content)
