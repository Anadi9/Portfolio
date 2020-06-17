import React from 'react';

function ReviewBox(props) {
    return (
        <div>
        <h6 className="text-muted">Rate me</h6>
        ⭐️⭐️⭐️⭐️⭐️<br/><br/>
        <label htmlFor="exampleFormControlTextarea1" className="text-muted">Your Reviews matter</label>
        <textarea className="form-control w-50" id="exampleFormControlTextarea1" rows="3"></textarea><br/>
        <button type="button" className="btn btn-primary btn-sm">Submit</button>
            
        </div>
    );
}

export default ReviewBox;