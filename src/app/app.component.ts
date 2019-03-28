import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {IMAGENET_CLASSES} from '@tensorflow-models/mobilenet/dist/imagenet_classes';
import {Component, Inject} from '@angular/core';

export interface DialogData 
{
  animal: string;
  name: string;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent 
{
	imgUrl = 'assets/cat.jpg'
	imgHeight:number = 224
	imgWidth:number = 224
	imgChannels:number = 3

	canvas: HTMLCanvasElement

 	constructor() {}


	onImgLoad()
	{
		var img = <HTMLImageElement> document.getElementById('cat')		
	 	this.canvas = <HTMLCanvasElement> document.getElementById('canvas')
		var context = this.canvas.getContext("2d")
		context.drawImage(img,0,0, this.imgHeight, this.imgHeight)
	}

	execute()
	{
		let canvas = <HTMLCanvasElement> document.getElementById('canvas')

		let img = tf.browser.fromPixels(canvas, 3) //let img = tf.fromPixels(canvas, 3)
		let img4 = tf.browser.fromPixels(canvas, 4) //let img4 = tf.fromPixels(canvas, 4)

		let model = mobilenet.load().then(model =>
		{
			var output = model.classify(img, 3).then(predictions =>
			{
				let tbuffer = tf.buffer([1000])
				var labelClasses = IMAGENET_CLASSES 

				let targetClass = predictions[0].className
				Object.keys(labelClasses).forEach(function(key) 
				{
					if (labelClasses[key].valueOf() == targetClass.valueOf()) 
					{
						tbuffer.set(1, parseInt(key));
					}
				})  		

		  		const oneHotLabels = tbuffer.toTensor()

		  		const getModelLogits = x => model.infer(x)
			    const lossFunction = x => tf.losses.softmaxCrossEntropy(oneHotLabels, getModelLogits(x).as1D())
			    const gradientFunction = tf.grad(lossFunction)
			    var gradient = gradientFunction(img)
			    

				// scale the gradient and apply to original image
				var perturbation = this.scaleGradient(gradient, 50)
				const zeroes = new Uint8Array(224*224).fill(0)
				let alphaChannel = tf.tensor3d(zeroes, [224, 224, 1]) 
				let perturbationWithAlpha = tf.concat([perturbation, alphaChannel], 2)	
				var adversarialImage = tf.add(tf.cast(img4,'float32'), perturbationWithAlpha)

				// Draw adversarial image to canvas
				var context = canvas.getContext("2d")
				let imgArray = Uint8ClampedArray.from(adversarialImage.dataSync());
				let imgData = context.createImageData(this.imgHeight, this.imgWidth);
				imgData.data.set(imgArray);
				context.putImageData(imgData, 0, 0);			
						
			}) 
		})	
	}


	private scaleGradient(gradient, epsilon) 
	{
		const gradientData = gradient.dataSync()

		const normalizedGradient = gradientData.map(x => 
		{
			return epsilon * Math.sign(x)
		})

		return tf.tensor(normalizedGradient).reshapeAs(gradient)
	}
}


