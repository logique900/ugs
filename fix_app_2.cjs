const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /case 'articles':\s*case 'clients':/;
code = code.replace(regex, `case 'articles':
      case 'categories':
        return (
          <GestionStocks 
            currentUser={currentUser} 
            articles={articles} 
            selectedProjectId={selectedProjectId} 
            onArticlesChange={setArticles}
            mouvements={mouvements}
            onMouvementsChange={setMouvements}
            projets={projets}
            ventes={ventes}
            fournisseurs={fournisseurs}
            onGenerateAchat={(nouvelAchat) => setAchats(prev => [nouvelAchat as any, ...prev])}
            onNavigate={setActiveTab}
            initialSubTab="catalogue"
          />
        );
      case 'clients':`);

fs.writeFileSync('src/App.tsx', code);
