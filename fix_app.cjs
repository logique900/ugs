const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import GestionStocks")) {
  code = code.replace("import { Objectifs } from './components/Objectifs';", "import { Objectifs } from './components/Objectifs';\nimport GestionStocks from './components/GestionStocks';");
}

const articlesRegex = /case 'articles':[\s\S]*?return \([\s\S]*?<Articles[\s\S]*?\/\>[\s\S]*?\);/;
code = code.replace(articlesRegex, `case 'articles':
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
        );`);

// We replaced articles, now categories block which is right below it. Wait, the regex replaced `articles` but left `categories`. Let's just remove the original `categories` block.
const categoriesRegex = /case 'categories':[\s\S]*?return \([\s\S]*?<Articles[\s\S]*?\/\>[\s\S]*?\);/;
code = code.replace(categoriesRegex, "");

const stockRegex = /case 'stock':[\s\S]*?return \([\s\S]*?<Stock[\s\S]*?\/\>[\s\S]*?\);/;
code = code.replace(stockRegex, `case 'stock':
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
            initialSubTab="mouvements"
          />
        );`);

fs.writeFileSync('src/App.tsx', code);
