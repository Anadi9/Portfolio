import React from 'react';
//import { Route, Switch } from 'react-router-dom';
import './App.css';
import NavBar from './Components/NavBar';
//import Education from './Contents/Education';
//import Skills from './Contents/Skills';
//import About from './Contents/About';
import LandingPage from './Contents/LandingPage';
//import Home from './Contents/Home';
//import Contact from './Contents/Contact';
import Background from './Components/Background';



function App() {
  return (
    <React.Fragment>
    <main className="App">
    <Background/>
    <NavBar/>
    <LandingPage/>
    </main>    
    </React.Fragment>
  );
}

export default App;
