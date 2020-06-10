import React from 'react';
import { Route, Switch } from 'react-router-dom';
import './App.css';
import Table from './Components/Table';
import Navbar from './Components/Navbar';
import Education from './Contents/Education';
import Contact from './Contents/Contact';
import Skills from './Contents/Skills';
import About from './Contents/About';


function App() {
  return (
    <React.Fragment>
    <main className="container-fluid">
    <Navbar/>
    <Table/>
      <Switch>
        <Route path="/Contact" component={Contact}/>
        <Route path="/Skills" component={Skills}/>
        <Route path="/Education" component={Education}/>
        <Route path="/About" component={About}/>
        </Switch>
       </main>    
    </React.Fragment>
  );
}

export default App;
