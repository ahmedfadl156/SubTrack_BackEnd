import mongoose from "mongoose";
import validator from "validator";

const subscriptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , "Subscription name is required"],
        trim: true,
        minLength: 1,
        maxLength: 100
    },
    price: {
        type: Number,
        required: [true , '']
    },
    currency: {
        type: String,
        enum: ['USD' , 'EUR' , 'EGP' , 'GBP'],
        default: 'USD'
    },
    frequency: {
        type: String,
        enum: ['daily' , 'weekly' , 'monthly' , 'yearly']
    },
    category: {
        type: String,
        enum: ['sports' , 'news' , 'entertainment' , 'lifestyle' , 'education' , 'technology' , 'finance' , 'politics' , 'other'],
        required: [true , 'Please Select a Category']
    },
    paymentMethod: {
        type: String,
        required: [true , 'Please Select a Payment Method'],
        trim: true
    },
    status: {
        type: String,
        enum: ['active' , 'cancelled' , 'expired'],
        default: "active"
    },
    startDate: {
        type: Date,
        required: [true , "Please Select Start Date For Subscription"],
        validate: {
            validator: (value) => value <= new Date(),
            message: "Start date must be in the past"
        }
    },
    renewalDate: {
        type: Date,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: "Renewal date must be after the start date"
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sharedWith: {
        type: [String],
        validate: {
            validator: function(values) {
                if (!values || values.length === 0) return true;
                return values.every((email) => validator.isEmail(email));
            },
            message: "sharedWith must contain valid email addresses"
        }
    },
    costPerPerson: {
        type: Number,
        default: 0,
    },
    cancelUrl: {
        type: String,
    }
}, {timestamps: true})


// Calculate the renewal date
subscriptionSchema.pre('save' , function(){
    if(!this.renewalDate){
        const renewalPeriods = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            yearly: 365,
        }

        this.renewalDate = new Date(this.startDate);
        this.renewalDate.setDate(this.renewalDate.getDate() + renewalPeriods[this.frequency])
    }

    if(this.renewalDate < new Date()){
        this.status = 'expired'
    }
})

// Calculate cost per person if there is shared mails
subscriptionSchema.pre('save' , function() {
    if(this.sharedWith.length > 0){
        this.costPerPerson = (this.price / (this.sharedWith.length + 1)).toFixed(1) 
    }else{
        this.sharedWith = undefined;
        this.costPerPerson = undefined;
    }
})

// Create The Model
const Subscription = mongoose.model("subscriptions" , subscriptionSchema)
export default Subscription;
