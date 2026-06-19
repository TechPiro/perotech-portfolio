document.addEventListener('DOMContentLoaded', function () {
    // Select all images with class 'svg'
    document.querySelectorAll('img.svg').forEach(function (img) {
        var imgID = img.id;
        var imgClass = img.className;
        var imgURL = img.src;

        fetch(imgURL)
            .then(function (response) {
                return response.text();
            })
            .then(function (data) {
                // Get the SVG tag, ignore the rest
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(data, "text/xml");
                var svg = xmlDoc.getElementsByTagName('svg')[0];

                if (svg) {
                    // Add replaced image's ID to the new SVG
                    if (typeof imgID !== 'undefined') {
                        svg.setAttribute('id', imgID);
                    }
                    // Add replaced image's classes to the new SVG
                    if (typeof imgClass !== 'undefined') {
                        svg.setAttribute('class', imgClass + ' replaced-svg');
                    }

                    // Remove any invalid XML tags as per http://validator.w3.org
                    svg.removeAttribute('xmlns:a');

                    // Check if the SVG has a stroke or fill defined. 
                    // If not, we might want to ensure it inherits or uses current color.
                    // But usually the CSS handles this.

                    // Replace image with new SVG
                    if (img.parentNode) {
                        img.parentNode.replaceChild(svg, img);
                    }
                }
            })
            .catch(function (error) {
                console.error('Error inlining SVG:', error);
            });
    });
});
