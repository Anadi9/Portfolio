import React from 'react';
import Greeting from './Greeting';
import { CoolIcon } from './Icons';


function Home(props) {
    return (
        <div >
        
        <h2 className="text-danger"><Greeting/></h2>
        <h1 className="text-danger">ANADI THAKUR here <CoolIcon/></h1>
        <p className="h4 text-white font-italic">
        I am here to <code>&lt;code&gt;</code> ideas and bring them to life.
        </p>
        <p className="h2 text-warning">Web Developer & Web Designer</p>
        <p className="text-muted font-italic">I Hate sleeping so I am here to provide my services to my clients.<br/>
            It's boredom to not have tension that's why I keep myself engaged in coding and developing UI/UX. </p>
        </div>
    );
}

export default Home;