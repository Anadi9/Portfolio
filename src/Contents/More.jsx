import React from 'react';
import { FacebookIcon, InstagramIcon, GmailIcon, GithubIcon, LinkedinIcon } from './Icons';
import ReviewBox from './ReviewBox';

function More(props) {
    return (
        <div>
            <h1 className="text-success">More</h1><br/>
            <ReviewBox/><br/><br/>
            <div>
            <p className="text-info">Contact</p>
            <a href="https://www.facebook.com/anadi.thakur.3"><FacebookIcon/></a>
            <a href="https://www.instagram.com/anadi_thakur_9"><InstagramIcon/></a>
            <a href="anadihakur99@gmail.com"><GmailIcon/></a>
            <a href="https://github.com/Anadi9"><GithubIcon/></a>
            <a href="https://www.linkedin.com/in/anadi-thakur-92163316b"><LinkedinIcon/></a>
            </div>
        </div>
    );
}

export default More;