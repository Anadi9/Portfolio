import React from 'react';
//import { Route, Switch } from 'react-router-dom';
import './App.css';
import NavBar from './Components/NavBar';
import Skills from './Contents/Skills';
import About from './Contents/About';
import LandingPage from './Contents/LandingPage';
import Contact from './Contents/Contact';
import Background from './Components/Background';
import Services from './Contents/Services';



function App() {
  return (
    <React.Fragment>
    <main className="App">
    <Background/>
    <NavBar/>
    <LandingPage/>
    <About/>
    <Services/>
    <Skills/>
    <Contact/>
    </main>    
    </React.Fragment>
  );
}

export default App;
