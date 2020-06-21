import React from 'react';
import { Route, Switch } from 'react-router-dom';
import './App.css';
//import HomeGrid from './Components/HomeGrid';
import Navbar from './Components/Navbar';
//import Education from './Contents/Education';
//import More from './Contents/More';
//import Skills from './Contents/Skills';
//import About from './Contents/About';
import HomePage from './Components/HomePage';
import Contact from './Contents/Contact';



function App() {
  return (
    <React.Fragment>
    <main>
    <Navbar/>
    <Switch>
    <Route path="/contact" component={Contact}/>
    <Route path="/" component={HomePage}/>
    </Switch>
    </main>    
    </React.Fragment>
  );
}

export default App;
