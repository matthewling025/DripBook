import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import BrewMethods from "./BrewMethods";

import BrewSession from "./BrewSession";

import BeanLibrary from "./BeanLibrary";

import BrewHistory from "./BrewHistory";

import BrewDetail from "./BrewDetail";

import DataInsights from "./DataInsights";

import RecipeCreator from "./RecipeCreator";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    BrewMethods: BrewMethods,
    
    BrewSession: BrewSession,
    
    BeanLibrary: BeanLibrary,
    
    BrewHistory: BrewHistory,
    
    BrewDetail: BrewDetail,
    
    DataInsights: DataInsights,
    
    RecipeCreator: RecipeCreator,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/BrewMethods" element={<BrewMethods />} />
                
                <Route path="/BrewSession" element={<BrewSession />} />
                
                <Route path="/BeanLibrary" element={<BeanLibrary />} />
                
                <Route path="/BrewHistory" element={<BrewHistory />} />
                
                <Route path="/BrewDetail" element={<BrewDetail />} />
                
                <Route path="/DataInsights" element={<DataInsights />} />
                
                <Route path="/RecipeCreator" element={<RecipeCreator />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}