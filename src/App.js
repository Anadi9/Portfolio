import React from 'react';
import { Route, Switch } from 'react-router-dom';
import './App.css';
import HomeTable from './Components/HomeTable';
import Navbar from './Components/Navbar';
import Education from './Contents/Education';
import More from './Contents/More';
import Skills from './Contents/Skills';
import About from './Contents/About';



function App() {
  return (
    <React.Fragment>
    <main className="container-fluid">
    <Navbar/>
      <Switch>
        <Route path="/More" component={More}/>
        <Route path="/Skills" component={Skills}/>
        <Route path="/Education" component={Education}/>
        <Route path="/About" component={About}/>
        <Route path="/" component={HomeTable}/>
        </Switch>
       </main>    
    </React.Fragment>
  );
}

export default App;
